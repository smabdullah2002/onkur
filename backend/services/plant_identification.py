import requests
import base64
from dotenv import load_dotenv
import os
from fastapi import UploadFile

load_dotenv()

API_KEY= os.getenv("PLANT_ID_API")
API_URL = os.getenv("PLANT_ID_URL")

async def identify_plant(file:UploadFile):
    image=await file.read()
    encoded=base64.b64encode(image).decode("utf-8")
    
    payload = {
    "images": [encoded],
}
    
    headers={
        "Content-Type":"application/json",
        "Api-Key":API_KEY
    }
    
    response= requests.post(
        API_URL,
        json=payload,
        headers=headers
    )
    data = response.json()

    plant_name = data["result"]["classification"]["suggestions"][0]["name"]

    print(plant_name)
    
    return response.json()