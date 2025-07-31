# OpenAI Rate Limit Checker Guide

This guide helps you check your OpenAI API rate limits and troubleshoot rate limiting issues.

## Quick Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements-rate-checker.txt
   ```

2. **Set your API key:**
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```
   
   Or edit `rate_limit_checker.py` and set the `api_key` variable directly.

3. **Run the checker:**
   ```bash
   python rate_limit_checker.py
   ```

## What the Script Does

### Method 1: Basic Check
- Makes a simple API call to test connectivity
- Shows token usage information
- Identifies common errors (rate limits, quota, authentication)

### Method 2: Detailed Headers Check
- Uses direct HTTP requests to access rate limit headers
- Shows detailed information:
  - **Requests Remaining**: How many API calls you have left
  - **Tokens Remaining**: How many tokens you can use
  - **Reset Times**: When your limits will refresh
  - **Total Limits**: Your maximum allowed requests/tokens

### Method 3: Multiple Model Check
- Tests rate limits across different models
- Helps identify which models you have access to
- Shows model-specific rate limits

## Understanding Rate Limits

### Common Rate Limit Types:
- **RPM (Requests Per Minute)**: How many API calls you can make per minute
- **TPM (Tokens Per Minute)**: How many tokens you can process per minute
- **RPD (Requests Per Day)**: Daily request limit
- **TPD (Tokens Per Day)**: Daily token limit

### Rate Limit Tiers:
- **Tier 1** (First $5): 3 RPM, 40K TPM
- **Tier 2** ($5+): 60 RPM, 80K TPM  
- **Tier 3** ($50+): 5K RPM, 300K TPM
- **Tier 4** ($100+): 5K RPM, 300K TPM
- **Tier 5** ($1000+): 10K RPM, 2M TPM

## Troubleshooting Common Issues

### "Rate limit exceeded"
```
Wait for the reset time or:
- Reduce request frequency
- Use fewer tokens per request
- Implement exponential backoff
```

### "You exceeded your current quota"
```
This means you've hit your spending limit:
- Add payment method to your OpenAI account
- Increase your usage limits
- Check your billing dashboard
```

### "Invalid authentication"
```
API key issues:
- Verify your API key is correct
- Check if the key has expired
- Ensure you have the right permissions
```

## Tips for Managing Rate Limits

1. **Use efficient models**: `gpt-4o-mini` is cheaper than `gpt-4`
2. **Batch requests**: Make fewer, larger requests when possible
3. **Implement retry logic**: Use exponential backoff for failed requests
4. **Monitor usage**: Regularly check your rate limits
5. **Cache responses**: Avoid duplicate API calls

## Example Output

```
🤖 OpenAI Rate Limit Checker
============================================================
🔑 Using API key: sk-1234567...abcd

============================================================
METHOD 2: Detailed Headers Check
============================================================
🔍 Checking rate limits with headers for model: gpt-4o-mini
==================================================
✅ API call successful!

📊 Rate Limit Information:
Requests Remaining: 4999
Requests Limit: 5000
Tokens Remaining: 299995
Tokens Limit: 300000
Requests Reset In: 12m0s
Tokens Reset In: 12m0s

📝 Response: Hello!
📊 Token Usage: {'prompt_tokens': 2, 'completion_tokens': 2, 'total_tokens': 4}
```

## Integration with Your TTS Project

You can integrate rate limit checking into your main project by importing functions:

```python
from rate_limit_checker import check_rate_limits_with_headers

# Check before making API calls
rate_info = check_rate_limits_with_headers()
if rate_info and int(rate_info.get('requests_remaining', 0)) > 10:
    # Safe to make API call
    pass
else:
    # Wait or handle rate limit
    pass
```