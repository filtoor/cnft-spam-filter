from PIL import Image
import requests
import pytesseract
from io import BytesIO
import re
import json
import time

def main(evt, ctx):
  start_time = time.time()
  image_url = evt["image_url"]
  # fetch image from URL
  print("Fetching image from URL", time.time() - start_time)
  response = requests.get(image_url)
  print("Image fetched, resizing", time.time() - start_time)


  # convert image to jpg and resize
  img = Image.open(BytesIO(response.content))
  img = img.convert("RGB")
  img = img.resize((1000, 1000))

  print("Resizing done, doing OCR", time.time() - start_time)
  text = pytesseract.image_to_string(img)

  # process text
  tokens = text.split()

  print("OCR done, returning", time.time() - start_time)
  return {"statusCode": 200, "body": json.dumps(tokens)}