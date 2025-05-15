 function copyText(element) {
            // Create a range object for the clicked command text
            var range = document.createRange();
            range.selectNode(element);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            
            // Execute the copy command
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error("Failed to copy text.");
            }
            
            // Clear selection after copying
            window.getSelection().removeAllRanges();
            }