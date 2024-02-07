from PIL import Image 
import requests
import io
import re
import json
import runpod
import pytesseract

def extract_text(job):
  image_url = job["input"]["image_url"]

  # fetch image from URL
  response = requests.get(image_url)

  # convert image to jpg and resize
  img = Image.open(io.BytesIO(response.content))
  img = img.convert("1")
  img = img.resize((1000, 1000))

  text = pytesseract.image_to_string(img)

  # process text
  tokens = text.split()
  contains_url = False
  for token in tokens:
    if (re.match("^[\S]+[.][\S]", token)):
      contains_url = True
      break

  return json.dumps({
    "imageWords": tokens,
    "containsUrl": contains_url
  })

runpod.serverless.start({"handler": extract_text})