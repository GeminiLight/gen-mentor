import re
import json
from typing import Dict, Any


def convert_json_output(output: str) -> Dict[str, Any]:
    """
    Convert raw JSON output from the LLM into structured format.

    Args:
        output: The JSON output from the LLM
        
    Returns:
        Structured JSON output
    """
    output = output.strip()
    if output.startswith("```json"):
        output = output[7:].strip()
    if output.endswith("```"):
        output = output[:-3].strip()
    if output.endswith("```json"):
        output = output[:-7].strip()
    try:
        # Attempt to parse the output as JSON
        return json.loads(output)
    except json.JSONDecodeError:
        # If parsing fails, try to extract JSON from the output string
        start_idx = output.find('{')
        end_idx = output.rfind('}') + 1
        if start_idx != -1 and end_idx != 0:
            json_str = output[start_idx:end_idx]
            return json.loads(json_str)
        else:
            raise json.JSONDecodeError("No valid JSON found in response", output, 0)

def get_text_from_response(response):
    """Extract text from the response object."""
    if 'messages' in response:
        return response['messages'][-1].content
    if 'message' in response['choices'][0]:
        return response['choices'][0]['message']['content']
    return response['choices'][0]['text']

def extract_think_and_result(info):
    "Extract think and result content from the response info."""
    think_match = re.search(r"<think>(.*?)</think>", info, re.DOTALL)
    think_content = think_match.group(1).strip() if think_match else ''
    result_content = re.sub(r"<think>.*?</think>", "", info, flags=re.DOTALL).strip()
    return think_content, result_content


def preprocess_response(response, only_text=True, exclude_think=False, json_output=False):
    if only_text or exclude_think or json_output:
        response = get_text_from_response(response)
    if exclude_think:
        think_content, result_content = extract_think_and_result(response)
        response = result_content
    if json_output:
        try:
            response = convert_json_output(response)
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON output: {e}")
            response = {"error": "Invalid JSON output", "raw_content": response}
            raise e
    return response

