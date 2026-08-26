import re
import json
from typing import Any, Dict, Tuple


def _first_json_object(output: str) -> Dict[str, Any]:
    """Find and decode the first complete JSON value in `output`.

    Models occasionally emit several JSON objects (an answer followed by an
    apology, or a result plus a repetition). A naive first-`{`-to-last-`}` span
    then contains two objects and fails with "Extra data". Scanning each `{`
    with `raw_decode` and keeping the first span that parses covers that case,
    as well as objects embedded in prose or markdown fences.
    """
    decoder = json.JSONDecoder()
    best: Tuple[int, Any] | None = None  # (length, value) — longest valid span wins
    for start in (i for i, ch in enumerate(output) if ch == "{"):
        try:
            value, end = decoder.raw_decode(output[start:])
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            if best is None or end > best[0]:
                best = (end, value)
    if best is None:
        raise json.JSONDecodeError("No valid JSON object found in response", output, 0)
    return best[1]


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
        # Attempt to parse the output as JSON. A clean parse is returned
        # as-is (including top-level arrays — some validators accept them).
        return json.loads(output)
    except json.JSONDecodeError:
        # The response wraps JSON in prose (or contains several objects):
        # extract the first/longest valid object instead of failing.
        return _first_json_object(output)


def get_text_from_response(response):
    """Extract text from the response object."""
    if isinstance(response, str):
        return response
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
            # Surface the parse failure to the caller (the endpoint turns it
            # into a 500 with the reason); the fallback dict below only applies
            # when a downstream validator accepts it.
            response = {"error": "Invalid JSON output", "raw_content": response}
            raise e
    return response
