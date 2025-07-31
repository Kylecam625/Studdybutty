#!/usr/bin/env python3
"""
OpenAI Rate Limit Checker
A utility script to check your current OpenAI API rate limits and usage.
"""

import os
import time
from openai import OpenAI
import sys

def check_rate_limits(api_key=None, model="gpt-4o-mini"):
    """
    Check OpenAI rate limits by making a simple API call and examining headers.
    
    Args:
        api_key (str): OpenAI API key. If None, will try to get from environment.
        model (str): Model to test with (default: gpt-4o-mini for cost efficiency)
    """
    
    # Get API key from parameter or environment
    if api_key is None:
        api_key = os.getenv('OPENAI_API_KEY')
    
    if not api_key:
        print("❌ Error: No API key provided. Set OPENAI_API_KEY environment variable or pass it as parameter.")
        return None
    
    # Initialize OpenAI client
    client = OpenAI(api_key=api_key)
    
    try:
        print(f"🔍 Checking rate limits for model: {model}")
        print("=" * 50)
        
        # Make a minimal API call
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": "Hi"}
            ],
            max_tokens=5  # Minimal tokens to save on usage
        )
        
        # Access the underlying HTTP response to get headers
        # Note: The new OpenAI client doesn't expose headers directly,
        # so we'll make a direct request to get the headers
        
        print("✅ API call successful!")
        print(f"Response: {response.choices[0].message.content}")
        print("\n📊 Usage Information:")
        print(f"Prompt Tokens: {response.usage.prompt_tokens}")
        print(f"Completion Tokens: {response.usage.completion_tokens}")
        print(f"Total Tokens: {response.usage.total_tokens}")
        
        return response
        
    except Exception as e:
        print(f"❌ Error making API call: {str(e)}")
        
        # Check if it's a rate limit error
        if "rate limit" in str(e).lower():
            print("\n🚫 RATE LIMIT EXCEEDED!")
            print("You've hit your rate limit. Details from error:")
            print(str(e))
        elif "quota" in str(e).lower():
            print("\n💳 QUOTA EXCEEDED!")
            print("You've exceeded your usage quota. Details:")
            print(str(e))
        elif "authentication" in str(e).lower():
            print("\n🔑 AUTHENTICATION ERROR!")
            print("Check your API key. Details:")
            print(str(e))
        
        return None

def check_rate_limits_with_headers(api_key=None, model="gpt-4o-mini"):
    """
    Alternative method using requests to get rate limit headers directly.
    """
    import requests
    
    if api_key is None:
        api_key = os.getenv('OPENAI_API_KEY')
    
    if not api_key:
        print("❌ Error: No API key provided.")
        return None
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": model,
        "messages": [{"role": "user", "content": "Hi"}],
        "max_tokens": 5
    }
    
    try:
        print(f"🔍 Checking rate limits with headers for model: {model}")
        print("=" * 50)
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data
        )
        
        if response.status_code == 200:
            print("✅ API call successful!")
            
            # Extract rate limit info from headers
            headers_info = {
                "requests_remaining": response.headers.get("x-ratelimit-remaining-requests"),
                "tokens_remaining": response.headers.get("x-ratelimit-remaining-tokens"), 
                "requests_reset": response.headers.get("x-ratelimit-reset-requests"),
                "tokens_reset": response.headers.get("x-ratelimit-reset-tokens"),
                "requests_limit": response.headers.get("x-ratelimit-limit-requests"),
                "tokens_limit": response.headers.get("x-ratelimit-limit-tokens")
            }
            
            print("\n📊 Rate Limit Information:")
            print(f"Requests Remaining: {headers_info['requests_remaining']}")
            print(f"Requests Limit: {headers_info['requests_limit']}")
            print(f"Tokens Remaining: {headers_info['tokens_remaining']}")
            print(f"Tokens Limit: {headers_info['tokens_limit']}")
            print(f"Requests Reset In: {headers_info['requests_reset']}")
            print(f"Tokens Reset In: {headers_info['tokens_reset']}")
            
            # Parse response
            response_data = response.json()
            usage = response_data.get('usage', {})
            content = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            print(f"\n📝 Response: {content}")
            print(f"📊 Token Usage: {usage}")
            
            return headers_info
            
        else:
            print(f"❌ API call failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def check_multiple_models(api_key=None):
    """Check rate limits across multiple models."""
    models_to_test = [
        "gpt-4o-mini",
        "gpt-4o", 
        "gpt-4-turbo",
        "gpt-3.5-turbo"
    ]
    
    print("🔍 Checking rate limits across multiple models...")
    print("=" * 60)
    
    for model in models_to_test:
        print(f"\n📋 Testing {model}:")
        print("-" * 30)
        check_rate_limits_with_headers(api_key, model)
        time.sleep(1)  # Small delay between requests

def main():
    """Main function to run the rate limit checker."""
    print("🤖 OpenAI Rate Limit Checker")
    print("=" * 60)
    
    # You can set your API key here or use environment variable
    api_key = None  # Set your API key here or leave None to use env var
    
    # Check if API key is available
    if not api_key:
        api_key = os.getenv('OPENAI_API_KEY')
    
    if not api_key:
        print("⚠️  No API key found!")
        print("Set your API key by:")
        print("1. Setting OPENAI_API_KEY environment variable")
        print("2. Or modify the api_key variable in this script")
        return
    
    print(f"🔑 Using API key: {api_key[:10]}...{api_key[-4:]}")
    
    # Method 1: Basic check
    print("\n" + "="*60)
    print("METHOD 1: Basic Rate Limit Check")
    print("="*60)
    check_rate_limits(api_key)
    
    # Method 2: Detailed headers check  
    print("\n" + "="*60)
    print("METHOD 2: Detailed Headers Check")
    print("="*60)
    check_rate_limits_with_headers(api_key)
    
    # Ask if user wants to check multiple models
    try:
        check_all = input("\n🤔 Do you want to check multiple models? (y/n): ").lower().strip()
        if check_all == 'y':
            check_multiple_models(api_key)
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")

if __name__ == "__main__":
    main()