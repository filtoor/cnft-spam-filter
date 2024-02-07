from PIL import Image
import requests
import pytesseract
from io import BytesIO
import re
import json

def main(evt, ctx):
  image_url = evt["image_url"]
  # fetch image from URL
  response = requests.get(image_url)

  # convert image to jpg and resize
  img = Image.open(BytesIO(response.content))
  img = img.convert("RGB")
  img = img.resize((1000, 1000))

  text = pytesseract.image_to_string(img)

  # process text
  tokens = text.split()

  return {"statusCode": 200, "body": json.dumps(tokens)}