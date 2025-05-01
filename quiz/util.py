import markdown2
from django.conf import settings
from groq import Groq

def call_groq(prompt):
    client = Groq(
        api_key=settings.GROQ_API_KEY,
    )

    chat_completion = client.chat.completions.create(
        messages=[
            {"role": "system","content": "you're teacher explain the question step-by-step, make your answers simple and brief, output in markdown format, answer in the language of the prompt"},
            {"role": "user", "content": prompt}
        ],
        max_completion_tokens=1000,
        model="meta-llama/llama-4-scout-17b-16e-instruct",
    )

    result = chat_completion.choices[0].message.content

    return result

def convert_to_HTML(result):
    markdowner = markdown2.Markdown()
    if result:
        content = markdowner.convert(result)
        return content
    else:
        return None
    
def map_question_answer(answer_formset_data):
    question_answer_mappings = {}
    for answer_form_data in answer_formset_data:
        question_index = answer_form_data.data[f'{answer_form_data.prefix}-for_question_index']
        try: 
            question_answer_mappings[question_index].append(answer_form_data)
        except KeyError:
            question_answer_mappings[question_index] = []
            question_answer_mappings[question_index].append(answer_form_data)
        
    return question_answer_mappings