# 1.2.3

- Functions may now be an empty array

# 1.2.2

- Parameters may now be an empty array

# 1.2.1

- Better character validation

# 1.2.0

- Switch to using the Vercel AI SDK, to provide more providers and models.

# 1.1.2

- Fix typo where DeepSeek was still included as a standalone provider (You should use the `apiUrl` option to use DeepSeek)

# 1.1.1

- Fix bug where the personality hash was not being generated correctly
- Fix race condition with message context when character was updated

# 1.1.0

- Add support for sdk-core v1.1.0
- Add support for more providers, through the new `apiUrl` config option, allowing you to use any OpenAI or Anthropic-style provider
