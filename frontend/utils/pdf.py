import pdfplumber


def extract_text_from_pdf(file):
    """Extracts text from the uploaded PDF file."""
    text = ""
    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text