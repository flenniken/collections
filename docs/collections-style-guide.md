# Collections Style Guide

This guide explains how to write documentation for the Collections
project.

You are writing for a general software developer audience. A document
explains how a software component works, how to configure a service,
or how to complete a Collections-related task.

Documentation is published on GitHub using GitHub-flavored
Markdown. The layout is optimized for viewing on an iPhone in portrait
mode, so avoid horizontal scrolling.

See the following document for an overview of github’s markdown
syntax:

* [Markdown Syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax) — GitHub-flavored Markdown syntax overview.

This document follows the style guide.

[⬇](#Contents) (table of contents at the bottom)

# Sections

Divide documents into small sections, each covering one topic.

* Begin each section with a topic sentence that summarizes its content.
* Use a top-level heading (#) for section titles.
* Write headings in short Title Case—avoid full sentences.
* Keep sections concise. If a section is long, use bold headings (**Heading**) instead of ## subheadings for internal structure.
* Consider making a long section into their own document.
* Use active voice whenever possible.
* Include specific examples to clarify concepts.
* End each section with a link to the Table of Contents. There is no need for a “Back to Top” link, as iPhones auto-scroll to the top when tapping the status bar.

[⬇](#Contents)

# Bullet Points

Use bullet points for lists, steps, and key points, but not as a
replacement for full paragraphs.

* Use the markdown * in the first column to start a bullet point.
* Don’t use the Unicode bullet characters since they do not signify a bullet point in markdown.
* Use bulleted lists instead of numbered lists.
* Numbered lists require extra spacing to avoid auto-resetting and are harder to maintain.
* Use one level of bullet points, don’t nest them.

[⬇](#Contents)

# Code Blocks

Use code blocks to show example code or commands.

* Explain the code above the example block in plain English.
* Write copy-paste-friendly examples.
* Horizontal scrolling is acceptable but should fit within a landscape width.
* Use real values, not placeholders. Define variables explicitly.
* Specify where to run the code (e.g., terminal, Docker container).
* Use ~~~ (tilde) instead of triple backticks (```) for code blocks.

Example:

Once the files are in S3, you can copy them locally to your CloudFront
folder for analysis:

~~~
# Run from Docker container
cd ~/collections
aws s3 sync s3://sflennikco/logs/cloudfront logs/cloudfront
~~~

# Links

Use annotated links when linking. An annotated link is a bullet point
link followed by two dashes then a short description of the link.

Example internal annotated link:

~~~
* [Code Blocks](#code-blocks) -- how to show example code.
~~~

You use internal links so you can quickly jump to sections in the
document.  You jump to the table of contents then jump to any section.

A link to the table of contents looks like this:

~~~
[⬇](#Contents)
~~~

Example external annotated link:

~~~
* [Google](https://www.google.com/) -- Google home page for searching the internet.
~~~

[⬇](#Contents)

#  TOC

Each document ends with a table of contents (TOC) section called
“Contents” for easy navigation.

* The TOC is a list of annotated links pointing to each section.
* Each annotation is a short sentence summarizing the section.

# Contents

* [Sections](#section) -- how to divide document into small sections.
* [Bullet Points](#bullet-points) -- how to use bullet points.
* [Code Blocks](#code-blocks) -- how to show example code.
* [Links](#links) -- how to format internal and external hyper links.
* [TOC](#toc) -- how to create a table of contents for easy navigation.
