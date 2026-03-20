from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from base import api_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://onkur.netlify.app",
        "https://onkur.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
