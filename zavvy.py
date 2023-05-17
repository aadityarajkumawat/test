import json
import requests

def make_request(prompt):
    klu_endpoint_url = 'https://engine.klu.ai/api/agent/action'
    klu_token = 'EeebQD9I6ZOi4LYDtqENg606h6Oe5VUUtyg//Lix+/8='

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {klu_token}'
    }

    payload = {
        'prompt': prompt,
        'agent': 'f7a5cbf1-67f5-4e72-91a3-e351747d0509'
    }

    response = requests.post(klu_endpoint_url, headers=headers, data=json.dumps(payload))
    data = response.json()

    return data

if __name__ == '__main__':
    print("Welcome to Klu. Type 'exit' to end the conversation.\n")
    while True:
        user_prompt = input("User: ")
        if user_prompt.lower() == 'exit': 
            break
        response_data = make_request(user_prompt)
        print(f"Klu: {response_data['msg']}\n")
