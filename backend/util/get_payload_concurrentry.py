import requests

def create_openai_payload_with_system(system_prompt, prompt, base64_image):
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f'{prompt}'},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]
            }
        ],
        "temperature": 0.2,
    }
    return payload

def generate_answer(base64_image, system_prompt, prompt, headers):
    payload = create_openai_payload_with_system(system_prompt, prompt, base64_image)
    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
    answer = response.json()['choices'][0]['message']['content']
    print('response generated')
    return answer
