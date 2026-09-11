#!/usr/bin/python3

"""
Admin API for saving collection JSON files on localhost.
"""

import os

if not os.environ.get("coder_env"):
  print("Run from the Collection's docker environment.")
  exit(1)

import json
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# 0.0.0.0 so docker can publish 127.0.0.1:3001:3001 to the host.
HOST = "0.0.0.0"
PORT = 3001
COLLECTIONS_ROOT = Path(__file__).resolve().parent.parent
MAX_BODY_BYTES = 5 * 1024 * 1024
ALLOWED_ORIGINS = (
  "http://localhost:8000",
  "http://127.0.0.1:8000",
)
SAVE_PATHS = ("/saveCollection", "/saveDescription")
DESCRIPTION_FIELDS = ("description", "indexDescription", "imageDescription")

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
  """
  path = collectionJsonPath(collection, root=root)
  text = json.dumps(collection, indent=2, ensure_ascii=False) + "\n"
  tmpPath = path.with_suffix(".json.tmp")
  with tmpPath.open("w", encoding="utf-8") as fh:
    fh.write(text)
  tmpPath.replace(path)
  return path

def saveDescription(payload, root=None):
  """
  Merge one description into dist/images/cN/cN.json.
  """
  if not isinstance(payload, dict):
    raise AdminApiException("Invalid JSON")
  field = payload.get("field")
  if field not in DESCRIPTION_FIELDS:
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
      else:
        path = saveDescription(payload, root=self.server.collectionsRoot)
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

  def test_saveDescriptionInvalidField(self):
    self.writeOriginalCollection()
    with self.assertRaises(AdminApiException):
      saveDescription({
        "cNum": 9,
        "field": "title",
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

if __name__ == "__main__":
  if len(sys.argv) > 1 and sys.argv[1] in ("-t", "--test"):
    sys.argv.pop(1)
    unittest.main()
  else:
    runServer()
