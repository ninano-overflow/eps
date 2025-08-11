// Test HTML parsing with the same logic as the React app
const testHtml = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">
<html>
<head>
  <title>Index of /download/</title>
</head>
<body>
<h1>Index of /download/</h1>
<pre><a></a><a></a><a></a><a></a>
<a href="/">..</a>
<a href="2025-07-30/">2025-07-30/</a>               01-Jan-1980 00:00     32K
<a href="APM/">APM/</a>                      01-Jan-1980 00:00     32K
<a href="System Volume Information/">System Volume Information/</a>  30-May-2024 16:45     32K
<a href="log/">log/</a>                      01-Jan-1970 00:00     32K
<hr />
</pre>
</body>
</html>`;

console.log('Testing HTML parsing...');

// Simulate DOMParser (similar to browser)
class MockDOMParser {
  parseFromString(html, type) {
    // Simple regex-based parsing for testing
    const linkMatches = [...html.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)];
    
    return {
      querySelectorAll: (selector) => {
        if (selector === 'a') {
          return linkMatches.map(match => ({
            getAttribute: (attr) => attr === 'href' ? match[1] : null,
            textContent: match[2],
            parentElement: {
              textContent: match[0] + (match.input ? match.input.substring(match.index + match[0].length, match.input.substring(match.index + match[0].length).indexOf('\n') + match.index + match[0].length) : '')
            }
          }));
        }
        return [];
      }
    };
  }
}

// Test the parsing logic
const parser = new MockDOMParser();
const doc = parser.parseFromString(testHtml, "text/html");
const links = doc.querySelectorAll("a");
const files = [];

console.log("Found links:", links.length);

links.forEach((link, index) => {
  const href = link.getAttribute("href");
  const linkText = link.textContent?.trim();
  
  console.log(`Link ${index}: href="${href}", text="${linkText}"`);
  
  // Skip parent directory, empty links, and invalid ones
  if (!href || !linkText || href === "../" || linkText === ".." || href === "/" || linkText === "") {
    console.log(`  -> Skipping: invalid link`);
    return;
  }
  
  // Skip if it looks like a relative path back
  if (href.startsWith("..")) {
    console.log(`  -> Skipping: parent directory`);
    return;
  }

  const isDirectory = href.endsWith("/");
  const fileName = isDirectory ? linkText.replace("/", "") : linkText;
  
  const fileItem = {
    name: fileName,
    type: isDirectory ? "directory" : "file",
    path: href,
  };
  
  console.log(`  -> Parsed:`, fileItem);
  files.push(fileItem);
});

console.log('\nFinal result:', files);
console.log(`Successfully parsed ${files.length} items`);