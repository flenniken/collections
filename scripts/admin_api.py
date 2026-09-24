#!/usr/bin/python3

"""
Admin API for saving collection JSON and thumbnails on localhost.
"""

import os

if not os.environ.get("coder_env"):
  print("Run from the Collection's docker environment.")
  exit(1)

import json
import math
import re
import shutil
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from PIL import Image, ImageDraw, ImageOps

# 0.0.0.0 so docker can publish 127.0.0.1:3001:3001 to the host.
HOST = "0.0.0.0"
PORT = 3001
COLLECTIONS_ROOT = Path(__file__).resolve().parent.parent
MAX_BODY_BYTES = 5 * 1024 * 1024
ALLOWED_ORIGINS = (
  "http://localhost:8000",
  "http://127.0.0.1:8000",
)
SAVE_PATHS = (
  "/saveCollection", "/saveDescription", "/saveOrder", "/saveThumbnail",
)
THUMB_SIZE = 480
JPEG_QUALITY = 80
PREVIEW_RE = re.compile(r"^c(\d+)-(\d+)-p\.jpg$")
TEXT_FIELDS = (
  "description", "indexDescription", "imageDescription", "title", "posted",
)

class AdminApiException(Exception):
  """ An exception we plan for. """
  pass

def collectionJsonPath(collection, root=None):
  """
  Return the dist/images/cN/cN.json path for the collection.
  """
  if root is None:
    root = COLLECTIONS_ROOT
  cNum = collection.get("cNum") if isinstance(collection, dict) else None
  if not isinstance(cNum, int) or isinstance(cNum, bool) or cNum < 1:
    raise AdminApiException("Invalid cNum")
  folder = root / "dist" / "images" / f"c{cNum}"
  path = folder / f"c{cNum}.json"
  if not folder.is_dir():
    raise AdminApiException(f"Missing collection folder: {folder}")
  return path

def writeCollectionJson(collection, root=None):
  """
  Write the collection JSON to dist/images/cN/cN.json.
  The images array is the collection order; do not persist order.
  """
  path = collectionJsonPath(collection, root=root)
  toWrite = dict(collection)
  toWrite.pop("order", None)
  toWrite.pop("ready", None)
  text = json.dumps(toWrite, indent=2, ensure_ascii=False) + "\n"
  tmpPath = path.with_suffix(".json.tmp")
  with tmpPath.open("w", encoding="utf-8") as fh:
    fh.write(text)
  tmpPath.replace(path)
  return path

def saveDescription(payload, root=None):
  """
  Merge one text field into dist/images/cN/cN.json.
  """
  if not isinstance(payload, dict):
    raise AdminApiException("Invalid JSON")
  field = payload.get("field")
  if field not in TEXT_FIELDS:
    raise AdminApiException("Invalid field")
  text = payload.get("text")
  if not isinstance(text, str):
    raise AdminApiException("Invalid text")

  path = collectionJsonPath(payload, root=root)
  if not path.is_file():
    raise AdminApiException(f"Missing collection json: {path}")
  try:
    collection = json.loads(path.read_text(encoding="utf-8"))
  except json.JSONDecodeError:
    raise AdminApiException("Invalid collection json")
  if not isinstance(collection, dict):
    raise AdminApiException("Invalid collection json")
  if collection.get("cNum") != payload.get("cNum"):
    raise AdminApiException("cNum does not match file")

  if field == "imageDescription":
    imageIx = payload.get("imageIx")
    if not isinstance(imageIx, int) or isinstance(imageIx, bool) or imageIx < 0:
      raise AdminApiException("Invalid imageIx")
    images = collection.get("images")
    if not isinstance(images, list) or imageIx >= len(images):
      raise AdminApiException("Invalid imageIx")
    image = images[imageIx]
    if not isinstance(image, dict):
      raise AdminApiException("Invalid imageIx")
    image["description"] = text
  else:
    collection[field] = text

  return writeCollectionJson(collection, root=root)

def validateOrderList(order, count):
  """
  Require a permutation of 0 .. count-1.
  """
  if not isinstance(order, list) or len(order) != count:
    raise AdminApiException("Invalid order")
  seen = set()
  for imageIx in order:
    if (not isinstance(imageIx, int) or isinstance(imageIx, bool)
        or imageIx < 0 or imageIx >= count or imageIx in seen):
      raise AdminApiException("Invalid order")
    seen.add(imageIx)
  if len(seen) != count:
    raise AdminApiException("Invalid order")

def applyOrder(items, order):
  """
  Return items in the given image-index order.
  """
  return [items[imageIx] for imageIx in order]

def applyOrderToZoomPoints(zoomPoints, order):
  """
  Reorder each zoom-point list to match the image order.
  """
  if not isinstance(zoomPoints, dict):
    raise AdminApiException("Invalid zoomPoints")
  reordered = {}
  for key, points in zoomPoints.items():
    if not isinstance(points, list) or len(points) != len(order):
      raise AdminApiException("Invalid zoomPoints")
    reordered[key] = applyOrder(points, order)
  return reordered

def saveOrder(payload, root=None):
  """
  Reorder images in dist/images/cN/cN.json from an order list.
  """
  if not isinstance(payload, dict):
    raise AdminApiException("Invalid JSON")
  path = collectionJsonPath(payload, root=root)
  if not path.is_file():
    raise AdminApiException(f"Missing collection json: {path}")
  try:
    collection = json.loads(path.read_text(encoding="utf-8"))
  except json.JSONDecodeError:
    raise AdminApiException("Invalid collection json")
  if not isinstance(collection, dict):
    raise AdminApiException("Invalid collection json")
  if collection.get("cNum") != payload.get("cNum"):
    raise AdminApiException("cNum does not match file")
  images = collection.get("images")
  if not isinstance(images, list):
    raise AdminApiException("Invalid images")
  order = payload.get("order")
  validateOrderList(order, len(images))
  identity = list(range(len(images)))
  if order == identity and "order" not in collection:
    return path
  collection["images"] = applyOrder(images, order)
  if "zoomPoints" in collection:
    collection["zoomPoints"] = applyOrderToZoomPoints(
      collection["zoomPoints"], order)
  collection.pop("order", None)
  return writeCollectionJson(collection, root=root)

def cropOrigin(value, name):
  """
  Return a non-negative pixel offset from JSON.
  """
  if isinstance(value, bool) or not isinstance(value, (int, float)):
    raise AdminApiException(f"Invalid {name}")
  if not math.isfinite(value):
    raise AdminApiException(f"Invalid {name}")
  origin = int(round(value))
  if origin < 0:
    raise AdminApiException(f"Invalid {name}")
  return origin

def thumbnailNameFromPreview(preview):
  """
  Return cN-M-t.jpg for a preview basename.
  """
  match = PREVIEW_RE.fullmatch(preview)
  if not match:
    raise AdminApiException("Invalid preview")
  return f"c{match.group(1)}-{match.group(2)}-t.jpg"

def writeCroppedThumbnail(previewPath, thumbPath, left, top, side=None):
  """
  Write a 480 x 480 JPEG from a square crop of the preview.
  side defaults to the largest square that fits. It cannot be
  smaller than 480.
  """
  with Image.open(previewPath) as img:
    rgb = ImageOps.exif_transpose(img).convert("RGB")
    width, height = rgb.size
    maxSide = min(width, height)
    if maxSide < THUMB_SIZE:
      raise AdminApiException("Preview is too small")
    if side is None:
      side = maxSide
    if side < THUMB_SIZE or side > maxSide:
      raise AdminApiException("Invalid crop")
    if left + side > width or top + side > height:
      raise AdminApiException("Invalid crop")
    square = rgb.crop((left, top, left + side, top + side))
    thumb = square.resize((THUMB_SIZE, THUMB_SIZE), Image.Resampling.LANCZOS)
    tmpPath = thumbPath.with_name(thumbPath.name + ".tmp")
    thumb.save(
      tmpPath,
      format="JPEG",
      quality=JPEG_QUALITY,
      optimize=True,
    )
  tmpPath.replace(thumbPath)

def saveThumbnail(payload, root=None):
  """
  Crop a preview to a 480 x 480 thumbnail and update sizet.
  """
  if not isinstance(payload, dict):
    raise AdminApiException("Invalid JSON")
  preview = payload.get("preview")
  if not isinstance(preview, str) or not PREVIEW_RE.fullmatch(preview):
    raise AdminApiException("Invalid preview")
  path = collectionJsonPath(payload, root=root)
  cNum = payload.get("cNum")
  match = PREVIEW_RE.fullmatch(preview)
  if int(match.group(1)) != cNum:
    raise AdminApiException("Invalid preview")
  if not path.is_file():
    raise AdminApiException(f"Missing collection json: {path}")
  try:
    collection = json.loads(path.read_text(encoding="utf-8"))
  except json.JSONDecodeError:
    raise AdminApiException("Invalid collection json")
  if not isinstance(collection, dict):
    raise AdminApiException("Invalid collection json")
  if collection.get("cNum") != cNum:
    raise AdminApiException("cNum does not match file")
  images = collection.get("images")
  if not isinstance(images, list):
    raise AdminApiException("Invalid images")
  image = None
  imageIx = None
  for ix, item in enumerate(images):
    if isinstance(item, dict) and item.get("iPreview") == preview:
      image = item
      imageIx = ix
      break
  if image is None:
    raise AdminApiException("Preview is not in the collection")

  folder = path.parent
  previewPath = folder / preview
  if not previewPath.is_file():
    raise AdminApiException(f"Missing preview: {preview}")
  left = cropOrigin(payload.get("left"), "left")
  top = cropOrigin(payload.get("top"), "top")
  side = None
  if "side" in payload and payload.get("side") is not None:
    side = cropOrigin(payload.get("side"), "side")
  thumbName = thumbnailNameFromPreview(preview)
  thumbPath = folder / thumbName
  writeCroppedThumbnail(previewPath, thumbPath, left, top, side)
  image["iThumbnail"] = thumbName
  image["sizet"] = thumbPath.stat().st_size
  writeCollectionJson(collection, root=root)

  tinDir = (root or COLLECTIONS_ROOT) / "dist" / "tin"
  tinPath = tinDir / thumbName
  if imageIx == 0:
    tinDir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(thumbPath, tinPath)
  elif tinPath.is_file():
    shutil.copyfile(thumbPath, tinPath)
  return thumbPath

class ApiHandler(BaseHTTPRequestHandler):
  server_version = "CollectionsAdminAPI/1.0"

  def do_OPTIONS(self):
    if self.path not in SAVE_PATHS:
      self.send_error(404)
      return
    self.send_response(204)
    self.sendCorsHeaders()
    self.end_headers()

  def do_POST(self):
    if self.path not in SAVE_PATHS:
      self.send_error(404)
      return
    try:
      length = int(self.headers.get("Content-Length", "0"))
    except ValueError:
      self.sendJson(400, {"ok": False, "message": "Invalid Content-Length"})
      return
    if length <= 0 or length > MAX_BODY_BYTES:
      self.sendJson(400, {"ok": False, "message": "Invalid body"})
      return

    raw = self.rfile.read(length)
    try:
      payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
      self.sendJson(400, {"ok": False, "message": "Invalid JSON"})
      return

    try:
      if self.path == "/saveCollection":
        path = writeCollectionJson(payload, root=self.server.collectionsRoot)
      elif self.path == "/saveDescription":
        path = saveDescription(payload, root=self.server.collectionsRoot)
      elif self.path == "/saveOrder":
        path = saveOrder(payload, root=self.server.collectionsRoot)
      else:
        path = saveThumbnail(payload, root=self.server.collectionsRoot)
    except AdminApiException as ex:
      self.sendJson(400, {"ok": False, "message": str(ex)})
      return

    relative = path.relative_to(self.server.collectionsRoot)
    print(f"Saved {relative}", flush=True)
    self.sendJson(200, {"ok": True, "path": str(relative)})

  def sendCorsHeaders(self):
    origin = self.headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS:
      self.send_header("Access-Control-Allow-Origin", origin)
    self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Content-Type")

  def sendJson(self, status, payload):
    body = json.dumps(payload).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json")
    self.send_header("Content-Length", str(len(body)))
    self.sendCorsHeaders()
    self.end_headers()
    self.wfile.write(body)

  def log_message(self, format, *args):
    sys.stderr.write("%s - %s\n" % (self.address_string(), format % args))

class AdminHTTPServer(HTTPServer):
  allow_reuse_address = True

  def __init__(self, server_address, handler, collectionsRoot):
    super().__init__(server_address, handler)
    self.collectionsRoot = collectionsRoot

def runServer(host=HOST, port=PORT, collectionsRoot=COLLECTIONS_ROOT):
  print(f"Admin API listening on http://localhost:{port}",
    flush=True)
  server = AdminHTTPServer((host, port), ApiHandler, collectionsRoot)
  server.serve_forever()

class TestModule(unittest.TestCase):

  def setUp(self):
    self.root = Path(tempfile.mkdtemp())
    self.folder = self.root / "dist" / "images" / "c9"
    self.folder.mkdir(parents=True)

  def tearDown(self):
    for path in sorted(self.root.rglob("*"), reverse=True):
      if path.is_file() or path.is_symlink():
        path.unlink()
      else:
        path.rmdir()
    self.root.rmdir()

  def test_collectionJsonPath(self):
    path = collectionJsonPath({"cNum": 9}, root=self.root)
    self.assertEqual(path, self.folder / "c9.json")

  def test_invalidCNum(self):
    for cNum in (0, -1, "9", 9.5, True, None):
      with self.assertRaises(AdminApiException):
        collectionJsonPath({"cNum": cNum}, root=self.root)

  def test_missingFolder(self):
    with self.assertRaises(AdminApiException):
      collectionJsonPath({"cNum": 99}, root=self.root)

  def test_writeCollectionJson(self):
    collection = {"cNum": 9, "title": "Jaclyn’s School"}
    path = writeCollectionJson(collection, root=self.root)
    saved = json.loads(path.read_text(encoding="utf-8"))
    self.assertEqual(saved["title"], "Jaclyn’s School")
    self.assertTrue(path.read_text(encoding="utf-8").endswith("\n"))

  def test_writeCollectionJsonOmitsOrder(self):
    collection = {
      "cNum": 9,
      "title": "Jaclyn’s School",
      "order": [1, 0],
      "ready": True,
    }
    path = writeCollectionJson(collection, root=self.root)
    saved = json.loads(path.read_text(encoding="utf-8"))
    self.assertEqual(saved["title"], "Jaclyn’s School")
    self.assertNotIn("order", saved)
    self.assertNotIn("ready", saved)

  def test_saveCollectionPost(self):
    server = AdminHTTPServer(("127.0.0.1", 0), ApiHandler, self.root)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
      port = server.server_address[1]
      body = json.dumps({"cNum": 9, "title": "Test"}).encode("utf-8")
      request = Request(
        f"http://127.0.0.1:{port}/saveCollection",
        data=body,
        headers={
          "Content-Type": "application/json",
          "Origin": "http://localhost:8000",
        },
        method="POST",
      )
      with urlopen(request) as response:
        payload = json.loads(response.read().decode("utf-8"))
        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers["Access-Control-Allow-Origin"],
          "http://localhost:8000")
      self.assertTrue(payload["ok"])
      self.assertEqual(payload["path"], "dist/images/c9/c9.json")
      saved = json.loads((self.folder / "c9.json").read_text(encoding="utf-8"))
      self.assertEqual(saved["title"], "Test")
    finally:
      server.shutdown()
      server.server_close()
      thread.join(timeout=2)

  def test_unknownPath(self):
    server = AdminHTTPServer(("127.0.0.1", 0), ApiHandler, self.root)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
      port = server.server_address[1]
      request = Request(
        f"http://127.0.0.1:{port}/nope",
        data=b"{}",
        headers={"Content-Type": "application/json"},
        method="POST",
      )
      with self.assertRaises(HTTPError) as raised:
        urlopen(request)
      self.assertEqual(raised.exception.code, 404)
    finally:
      server.shutdown()
      server.server_close()
      thread.join(timeout=2)

  def writeOriginalCollection(self):
    collection = {
      "cNum": 9,
      "title": "Keep me",
      "posted": "2020-01-01",
      "indexDescription": "old index",
      "description": "old thumbs",
      "images": [
        {"description": "img0"},
        {"description": "img1"},
      ],
    }
    writeCollectionJson(collection, root=self.root)
    return collection

  def test_saveDescriptionIndex(self):
    self.writeOriginalCollection()
    saveDescription({
      "cNum": 9,
      "field": "indexDescription",
      "text": "new index",
    }, root=self.root)
    saved = json.loads((self.folder / "c9.json").read_text(encoding="utf-8"))
    self.assertEqual(saved["title"], "Keep me")
    self.assertEqual(saved["indexDescription"], "new index")
    self.assertEqual(saved["description"], "old thumbs")
    self.assertEqual(saved["images"][1]["description"], "img1")

  def test_saveDescriptionThumbs(self):
    self.writeOriginalCollection()
    saveDescription({
      "cNum": 9,
      "field": "description",
      "text": "new thumbs",
    }, root=self.root)
    saved = json.loads((self.folder / "c9.json").read_text(encoding="utf-8"))
    self.assertEqual(saved["description"], "new thumbs")
    self.assertEqual(saved["indexDescription"], "old index")
    self.assertEqual(saved["images"][0]["description"], "img0")

  def test_saveDescriptionImage(self):
    self.writeOriginalCollection()
    saveDescription({
      "cNum": 9,
      "field": "imageDescription",
      "imageIx": 1,
      "text": "new img1",
    }, root=self.root)
    saved = json.loads((self.folder / "c9.json").read_text(encoding="utf-8"))
    self.assertEqual(saved["images"][0]["description"], "img0")
    self.assertEqual(saved["images"][1]["description"], "new img1")
    self.assertEqual(saved["title"], "Keep me")

  def test_saveTitle(self):
    self.writeOriginalCollection()
    saveDescription({
      "cNum": 9,
      "field": "title",
      "text": "New title",
    }, root=self.root)
    saved = json.loads((self.folder / "c9.json").read_text(encoding="utf-8"))
    self.assertEqual(saved["title"], "New title")
    self.assertEqual(saved["posted"], "2020-01-01")
    self.assertEqual(saved["indexDescription"], "old index")

  def test_savePosted(self):
    self.writeOriginalCollection()
    saveDescription({
      "cNum": 9,
      "field": "posted",
      "text": "2026-09-13",
    }, root=self.root)
    saved = json.loads((self.folder / "c9.json").read_text(encoding="utf-8"))
    self.assertEqual(saved["posted"], "2026-09-13")
    self.assertEqual(saved["title"], "Keep me")

  def test_saveDescriptionInvalidField(self):
    self.writeOriginalCollection()
    with self.assertRaises(AdminApiException):
      saveDescription({
        "cNum": 9,
        "field": "bogus",
        "text": "nope",
      }, root=self.root)

  def test_saveDescriptionInvalidImageIx(self):
    self.writeOriginalCollection()
    for imageIx in (-1, 2, True, "1", None):
      with self.assertRaises(AdminApiException):
        saveDescription({
          "cNum": 9,
          "field": "imageDescription",
          "imageIx": imageIx,
          "text": "nope",
        }, root=self.root)

  def test_saveDescriptionPost(self):
    self.writeOriginalCollection()
    server = AdminHTTPServer(("127.0.0.1", 0), ApiHandler, self.root)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
      port = server.server_address[1]
      body = json.dumps({
        "cNum": 9,
        "field": "indexDescription",
        "text": "posted index",
      }).encode("utf-8")
      request = Request(
        f"http://127.0.0.1:{port}/saveDescription",
        data=body,
        headers={
          "Content-Type": "application/json",
          "Origin": "http://localhost:8000",
        },
        method="POST",
      )
      with urlopen(request) as response:
        payload = json.loads(response.read().decode("utf-8"))
        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers["Access-Control-Allow-Origin"],
          "http://localhost:8000")
      self.assertTrue(payload["ok"])
      saved = json.loads((self.folder / "c9.json").read_text(encoding="utf-8"))
      self.assertEqual(saved["indexDescription"], "posted index")
      self.assertEqual(saved["title"], "Keep me")
    finally:
      server.shutdown()
      server.server_close()
      thread.join(timeout=2)

  def writeCollectionWithOrder(self):
    collection = {
      "cNum": 9,
      "title": "Keep me",
      "images": [
        {"description": "img0"},
        {"description": "img1"},
        {"description": "img2"},
      ],
      "zoomPoints": {
        "430x933": [
          {"scale": 1, "tx": 0, "ty": 0},
          {"scale": 2, "tx": 1, "ty": 1},
          {"scale": 3, "tx": 2, "ty": 2},
        ],
      },
    }
    writeCollectionJson(collection, root=self.root)
    return collection

  def test_saveOrder(self):
    self.writeCollectionWithOrder()
    saveOrder({
      "cNum": 9,
      "order": [2, 0, 1],
    }, root=self.root)
    saved = json.loads((self.folder / "c9.json").read_text(encoding="utf-8"))
    self.assertEqual(saved["title"], "Keep me")
    self.assertEqual([image["description"] for image in saved["images"]],
      ["img2", "img0", "img1"])
    self.assertEqual(
      [point["scale"] for point in saved["zoomPoints"]["430x933"]],
      [3, 1, 2])
    self.assertNotIn("order", saved)

  def test_saveOrderIdentity(self):
    self.writeCollectionWithOrder()
    path = saveOrder({
      "cNum": 9,
      "order": [0, 1, 2],
    }, root=self.root)
    saved = json.loads(path.read_text(encoding="utf-8"))
    self.assertEqual([image["description"] for image in saved["images"]],
      ["img0", "img1", "img2"])

  def test_saveOrderRemovesOrderField(self):
    collection = self.writeCollectionWithOrder()
    collection["order"] = [0, 1, 2]
    writeCollectionJson(collection, root=self.root)
    saveOrder({
      "cNum": 9,
      "order": [0, 1, 2],
    }, root=self.root)
    saved = json.loads((self.folder / "c9.json").read_text(encoding="utf-8"))
    self.assertNotIn("order", saved)

  def test_saveOrderInvalid(self):
    self.writeCollectionWithOrder()
    for order in ([0, 1], [0, 1, 1], [0, 1, 3], [0, 1, "2"], None):
      with self.assertRaises(AdminApiException):
        saveOrder({
          "cNum": 9,
          "order": order,
        }, root=self.root)

  def test_saveOrderPost(self):
    self.writeCollectionWithOrder()
    server = AdminHTTPServer(("127.0.0.1", 0), ApiHandler, self.root)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
      port = server.server_address[1]
      body = json.dumps({
        "cNum": 9,
        "order": [1, 2, 0],
      }).encode("utf-8")
      request = Request(
        f"http://127.0.0.1:{port}/saveOrder",
        data=body,
        headers={
          "Content-Type": "application/json",
          "Origin": "http://localhost:8000",
        },
        method="POST",
      )
      with urlopen(request) as response:
        payload = json.loads(response.read().decode("utf-8"))
        self.assertEqual(response.status, 200)
      self.assertTrue(payload["ok"])
      saved = json.loads((self.folder / "c9.json").read_text(encoding="utf-8"))
      self.assertEqual([image["description"] for image in saved["images"]],
        ["img1", "img2", "img0"])
    finally:
      server.shutdown()
      server.server_close()
      thread.join(timeout=2)

  def writePreviewJpeg(self, name, width, height, color, mark=None):
    path = self.folder / name
    img = Image.new("RGB", (width, height), color)
    if mark is not None:
      box, markColor = mark
      draw = ImageDraw.Draw(img)
      draw.rectangle(box, fill=markColor)
    img.save(path, format="JPEG", quality=90)
    return path

  def writeCollectionForThumb(self):
    collection = {
      "cNum": 9,
      "title": "Keep me",
      "images": [
        {
          "iPreview": "c9-1-p.jpg",
          "iThumbnail": "c9-1-t.jpg",
          "description": "img0",
          "sizet": 1,
        },
        {
          "iPreview": "c9-2-p.jpg",
          "iThumbnail": "c9-2-t.jpg",
          "description": "img1",
          "sizet": 1,
        },
      ],
    }
    writeCollectionJson(collection, root=self.root)
    return collection

  def test_saveThumbnail_landscape_left(self):
    self.writeCollectionForThumb()
    self.writePreviewJpeg(
      "c9-1-p.jpg", 1000, 600, (0, 0, 255),
      mark=((0, 200, 200, 400), (255, 0, 0)))
    path = saveThumbnail({
      "cNum": 9,
      "preview": "c9-1-p.jpg",
      "left": 0,
      "top": 0,
    }, root=self.root)
    self.assertEqual(path, self.folder / "c9-1-t.jpg")
    with Image.open(path) as thumb:
      self.assertEqual(thumb.size, (480, 480))
      left = thumb.getpixel((20, 240))
      self.assertGreater(left[0], 240)
      self.assertLess(left[1], 20)
      self.assertLess(left[2], 20)
    saved = json.loads((self.folder / "c9.json").read_text(encoding="utf-8"))
    self.assertEqual(saved["images"][0]["sizet"], path.stat().st_size)
    self.assertEqual(saved["title"], "Keep me")
    tin = self.root / "dist" / "tin" / "c9-1-t.jpg"
    self.assertTrue(tin.is_file())
    self.assertEqual(tin.stat().st_size, path.stat().st_size)

  def test_saveThumbnail_center_not_left_mark(self):
    self.writeCollectionForThumb()
    self.writePreviewJpeg(
      "c9-1-p.jpg", 1000, 600, (0, 0, 255),
      mark=((0, 200, 200, 400), (255, 0, 0)))
    path = saveThumbnail({
      "cNum": 9,
      "preview": "c9-1-p.jpg",
      "left": 200,
      "top": 0,
    }, root=self.root)
    with Image.open(path) as thumb:
      center = thumb.getpixel((240, 240))
      self.assertLess(center[0], 20)
      self.assertLess(center[1], 20)
      self.assertGreater(center[2], 240)

  def test_saveThumbnail_invalid_crop(self):
    self.writeCollectionForThumb()
    self.writePreviewJpeg("c9-1-p.jpg", 1000, 600, (0, 0, 255))
    with self.assertRaises(AdminApiException):
      saveThumbnail({
        "cNum": 9,
        "preview": "c9-1-p.jpg",
        "left": 401,
        "top": 0,
      }, root=self.root)

  def test_saveThumbnail_small_square(self):
    self.writeCollectionForThumb()
    self.writePreviewJpeg(
      "c9-1-p.jpg", 1000, 800, (0, 0, 255),
      mark=((0, 0, 480, 480), (255, 0, 0)))
    path = saveThumbnail({
      "cNum": 9,
      "preview": "c9-1-p.jpg",
      "left": 0,
      "top": 0,
      "side": 480,
    }, root=self.root)
    with Image.open(path) as thumb:
      self.assertEqual(thumb.size, (480, 480))
      pixel = thumb.getpixel((20, 20))
      self.assertGreater(pixel[0], 240)
      self.assertLess(pixel[1], 20)
      self.assertLess(pixel[2], 20)

  def test_saveThumbnail_side_too_small(self):
    self.writeCollectionForThumb()
    self.writePreviewJpeg("c9-1-p.jpg", 1000, 800, (0, 0, 255))
    with self.assertRaises(AdminApiException):
      saveThumbnail({
        "cNum": 9,
        "preview": "c9-1-p.jpg",
        "left": 0,
        "top": 0,
        "side": 479,
      }, root=self.root)

  def test_saveThumbnail_second_image_skips_missing_tin(self):
    self.writeCollectionForThumb()
    self.writePreviewJpeg("c9-2-p.jpg", 800, 1000, (0, 255, 0))
    saveThumbnail({
      "cNum": 9,
      "preview": "c9-2-p.jpg",
      "left": 0,
      "top": 0,
    }, root=self.root)
    self.assertFalse((self.root / "dist" / "tin" / "c9-2-t.jpg").exists())
    self.assertTrue((self.folder / "c9-2-t.jpg").is_file())

  def test_saveThumbnailPost(self):
    self.writeCollectionForThumb()
    self.writePreviewJpeg("c9-1-p.jpg", 800, 800, (0, 0, 255))
    server = AdminHTTPServer(("127.0.0.1", 0), ApiHandler, self.root)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
      port = server.server_address[1]
      body = json.dumps({
        "cNum": 9,
        "preview": "c9-1-p.jpg",
        "left": 0,
        "top": 0,
      }).encode("utf-8")
      request = Request(
        f"http://127.0.0.1:{port}/saveThumbnail",
        data=body,
        headers={
          "Content-Type": "application/json",
          "Origin": "http://localhost:8000",
        },
        method="POST",
      )
      with urlopen(request) as response:
        payload = json.loads(response.read().decode("utf-8"))
        self.assertEqual(response.status, 200)
      self.assertTrue(payload["ok"])
      self.assertEqual(payload["path"], "dist/images/c9/c9-1-t.jpg")
      self.assertTrue((self.folder / "c9-1-t.jpg").is_file())
    finally:
      server.shutdown()
      server.server_close()
      thread.join(timeout=2)

if __name__ == "__main__":
  if len(sys.argv) > 1 and sys.argv[1] in ("-t", "--test"):
    sys.argv.pop(1)
    unittest.main()
  else:
    runServer()
