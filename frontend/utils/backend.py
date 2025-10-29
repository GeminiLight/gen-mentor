import httpx
import streamlit as st

def request_backend(api_endpoint, data):
    response = httpx.post(api_endpoint, json=data, timeout=360)
    if response.status_code == 200:
        return response.json()
    else:
        st.write("Failed to fetch data. Status code:", response.status_code)
