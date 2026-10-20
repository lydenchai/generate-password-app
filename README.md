# Password Generator

A simple web-based password generator that runs entirely in your browser.

Just open `index.html` in any browser to use it.

## What it does

- Generates passwords using `crypto.getRandomValues()` and Fisher-Yates shuffle
- Slider and presets for length (4 to 64 chars)
- Toggles for uppercase, lowercase, numbers, and symbols
- Filter to exclude similar/ambiguous characters (`i`, `l`, `1`, `L`, `o`, `0`, `O`)
- Optional username and website inputs to copy formatted credentials together
- Password strength indicator
- Light and dark theme toggle
- Session history of recently generated passwords
