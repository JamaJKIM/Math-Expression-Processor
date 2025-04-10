// Function to process text input
function processText() {
    const inputText = document.getElementById('inputText').value;
    const outputText = document.getElementById('processedText');
    
    // Process the text and update the output
    const processedText = processBoldAndMath(inputText);
    outputText.innerHTML = processedText;
    
    // Rerender MathJax
    if (window.MathJax) {
        MathJax.typesetClear();
        MathJax.typesetPromise([outputText]).then(() => {
            console.log('MathJax rendering complete');
        }).catch((err) => {
            console.error('MathJax rendering error:', err);
        });
    }
}

// Process bold text and math expressions
function processBoldAndMath(text) {
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split text into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    // Process each paragraph
    const processedParagraphs = paragraphs.map(paragraph => {
        // Skip empty paragraphs
        if (!paragraph.trim()) return '';
        
        // Check if this is a table
        if (paragraph.includes('|') && paragraph.includes('\n')) {
            return processTable(paragraph);
        }
        
        // Clean up whitespace
        let processed = paragraph.trim().replace(/\s+/g, ' ');
        
        // Handle numbered lists
        processed = processed.replace(/^\d+\.\s+/gm, (match) => `<span class="list-number">${match}</span>`);
        
        // Process bold text and detect sections
        processed = processed.replace(/\*\*(.*?)\*\*/g, (_, content) => {
            // Escape HTML entities in the content only
            const safeContent = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            
            // Check if this is a section header
            if (content.includes(':')) {
                const sectionType = content.split(':')[0].trim().toLowerCase();
                // Generate a class name from the section type
                const className = `section-${sectionType.replace(/\s+/g, '-')}`;
                return `<strong class="section-header">${safeContent}</strong>`;
            }
            
            return `<strong>${safeContent}</strong>`;
        });
        
        // Process italics
        processed = processed.replace(/\*(.*?)\*/g, (_, content) => {
            const safeContent = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            return `<em>${safeContent}</em>`;
        });
        
        processed = processed.replace(/_(.*?)_/g, (_, content) => {
            const safeContent = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            return `<em>${safeContent}</em>`;
        });
        
        // Process underline
        processed = processed.replace(/__(.*?)__/g, (_, content) => {
            const safeContent = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            return `<u>${safeContent}</u>`;
        });
        
        // Process bullet points
        processed = processed.replace(/^[-*]\s+/gm, '• ');
        
        // Process math expressions
        processed = fixMathExpressions(processed);
        
        // Check if this paragraph starts with a section header
        if (processed.includes('<strong class="section-header">')) {
            return `<p class="content-section">${processed}</p>`;
        } else {
            return `<p>${processed}</p>`;
        }
    });
    
    // Join paragraphs and handle horizontal rules
    return processedParagraphs
        .join('\n')
        .replace(/---/g, '<hr class="my-4">')
        .replace(/\n/g, '');
}

// Process markdown table
function processTable(tableText) {
    const lines = tableText.trim().split('\n');
    
    // Need at least header, separator, and one data row
    if (lines.length < 3) return tableText;
    
    // Process header row
    const headers = lines[0]
        .split('|')
        .filter(cell => cell.trim())
        .map(cell => cell.trim());
    
    // Verify separator row (should contain only -, |, and spaces)
    const separatorValid = lines[1]
        .split('|')
        .filter(cell => cell.trim())
        .every(cell => /^[-\s]+$/.test(cell.trim()));
    
    if (!separatorValid) return tableText;
    
    // Process data rows
    const rows = lines.slice(2).map(line => 
        line
            .split('|')
            .filter(cell => cell.trim())
            .map(cell => cell.trim())
    );
    
    // Build HTML table
    const tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    ${headers.map(header => `<th>${header}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${rows.map(row => `
                    <tr>
                        ${row.map(cell => `<td>${cell}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    return tableHTML;
}

// Fix mathematical expressions
function fixMathExpressions(text) {
    // Preserve existing LaTeX expressions with \( \) first
    text = text.replace(/\\\((.*?)\\\)/g, (_, expr) => {
        // Remove extra spaces inside the expression
        return `$${expr.trim()}$`;
    });
    
    // Fix currency values with escaped parentheses
    text = text.replace(/\\\((\d+,\d+)\)/g, '$$$1');  // Fix \(280,000) to $280,000
    text = text.replace(/\\\((\d+,\d+)/g, '$$$1');    // Fix \(280,000 to $280,000
    text = text.replace(/to\\\)(\d+,\d+)/g, 'to $$$1'); // Fix to\)42,000 to to $42,000
    
    // First, handle any existing malformed rac patterns
    text = text.replace(/rac(\d+)/g, (_, num) => `$\\frac{${num}}{1}$`);
    
    // Handle complex fractions with division symbol (1/2 ÷ 1/4)
    text = text.replace(/(\d+)\/(\d+)\s*÷\s*(\d+)\/(\d+)/g, 
        (_, n1, d1, n2, d2) => `$\\frac{\\frac{${n1}}{${d1}}}{\\frac{${n2}}{${d2}}}$`
    );
    
    // Handle simple division expressions
    text = text.replace(/(\d+)\s*÷\s*(\d+)/g,
        (_, n1, n2) => `$\\frac{${n1}}{${n2}}$`
    );
    
    // Handle simple fractions, but only if not already in LaTeX format
    text = text.replace(/(?<!\$)(\d+)\/(\d+)(?!\d)/g,
        (_, num, den) => `$\\frac{${num}}{${den}}$`
    );
    
    // Handle unit rates (miles per hour, etc.)
    text = text.replace(/(\d+)\s*(miles?|hours?|minutes?|seconds?)\s*per\s*(\d+)\s*(miles?|hours?|minutes?|seconds?)/g,
        (_, n1, u1, n2, u2) => `$\\frac{${n1} ${u1}}{${n2} ${u2}}$`
    );
    
    // Fix any remaining rac patterns that might have been created
    text = text.replace(/\\rac(\d+)(\d+)/g,
        (_, n1, n2) => `$\\frac{${n1}}{${n2}}$`
    );
    
    // Ensure proper spacing around math expressions
    text = text.replace(/\$\s*(\S+)\s*\$/g, '$$$1$$');
    
    return text;
}

// Initialize MathJax configuration
window.MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true,
        packages: {'[+]': ['amsmath', 'base', 'physics']}
    },
    options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'math-display'
    },
    svg: {
        fontCache: 'global'
    },
    startup: {
        pageReady: () => {
            return MathJax.startup.defaultPageReady().then(() => {
                console.log('MathJax is ready');
                MathJax.typesetPromise();
            });
        }
    }
};

// Add event listener for the process button
document.addEventListener('DOMContentLoaded', () => {
    const processButton = document.getElementById('processButton');
    if (processButton) {
        processButton.addEventListener('click', processText);
    }
});
