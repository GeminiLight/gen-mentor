import ast


def convert_knowledge_perspectives_to_markdown(data):
    markdown_text = ""
    for category, items in data.items():
        markdown_text += f"- **{category.capitalize()}**\n"
        for item in items:
            markdown_text += f"  - {item}\n"
    return markdown_text


def prepare_markdown_document(document_structure, knowledge_points, knowledge_drafts):
    if isinstance(knowledge_points, str):
        knowledge_points = ast.literal_eval(knowledge_points)
    if isinstance(knowledge_drafts, str):
        knowledge_drafts = ast.literal_eval(knowledge_drafts)
    if isinstance(document_structure, str):
        document_structure = ast.literal_eval(document_structure)
    print("!!!doucment_stru:",document_structure)
    part_titles = {
        'foundational': "## Foundational Concepts",
        'practical': "## Practical Applications",
        'strategic': "## Strategic Insights"
    }

    learning_document = f"# {document_structure['title']}"
    learning_document += f"\n\n{document_structure['overview']}"

    for k_type, part_title in part_titles.items():
        learning_document += f"\n\n{part_title}\n"
        for k_id, knowledge_point in enumerate(knowledge_points):
            if knowledge_point['type'] != k_type:
                continue
            knowledge_draft = knowledge_drafts[k_id]
            learning_document += f"\n\n### {knowledge_draft['title']}\n"
            learning_document += f"\n\n{knowledge_draft['content']}\n"
    learning_document += f"\n\n## Summary\n\n{document_structure['summary']}"
    return learning_document
