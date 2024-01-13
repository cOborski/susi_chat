const terminal = document.getElementById('terminal');
let lastInput = '';
let currentPath = '/';
let fileSystem = { '/': {} };
let terminalStack = [];
let terminalInterval;
let apihost = localStorage.getItem('apihost') || 'http://localhost:8001';
let promptPrefix = '] ';
let pp = 0.0; // prompt processing
let tg = 0.0; // text generation
let messages = [];
terminalStack = [];
resetMessages();
const stringsToRemove = [
    "[INST]", "<<USER>>", "<</INST>>", "<<SYS>>", "</SYS>>",
    "<|im_start|>system", "<|im_start|>user", "<|im_start|>assistant", "<|im_start|>"];
hljs.highlightAll();
marked.setOptions({
    langPrefix: 'language-',
    highlight: function(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  });

log("SUSI.AI Chat v2");
log("API Host: " + apihost);
log("Type 'help' for a list of available commands");

function initializeTerminal() {
    // [Event listener code remains unchanged]
}

function executeCommand(command) {
    const args = command.match(/('.*?'|".*?"|[^"\s]+)+/g); // Split by space, but ignore spaces inside quotes
    switch (args[0]) {
        case 'help':
            if (args[1]) {
                switch (args[1]) {
                    case 'help':
                        log('help: help [command]');
                        log('    Display information about builtin commands.');
                        break;
                    case 'reset':
                        log('reset: reset');
                        log('    Reset the terminal messages.');
                        break;
                    case 'touch':
                        log('touch: touch <file>');
                        log('    Create a file.');
                        break;
                    case 'mv':
                        log('mv: mv <oldname> <newname>');
                        log('    Rename a file.');
                        break;
                    case 'less':
                        log('less: less <file>');
                        log('    Display the contents of a file.');
                        break;
                    case 'cat':
                        log('cat: cat <file>');
                        log('    Create a file.');
                        break;
                    case 'ls':
                        log('ls: ls');
                        log('    List directory contents.');
                        break;
                    case 'pwd':
                        log('pwd: pwd');
                        log('    Print the name of the current working directory.');
                        break;
                    case 'cd':
                        log('cd: cd <path>');
                        log('    Change the current working directory.');
                        break;
                    case 'mkdir':
                        log('mkdir: mkdir <dir>');
                        log('    Create a directory.');
                        break;
                    case 'rmdir':
                        log('rmdir: rmdir <dir>');
                        log('    Remove a directory.');
                        break;
                    case 'tree':
                        log('tree: tree');
                        log('    Display directory tree.');
                        break;
                    case 'set':
                        log('set: set <attribute> <value>');
                        log('    Set an attribute.');
                        break;
                    case 'get':
                        log('get: get <attribute>');
                        log('    Get an attribute.');
                        break;
                    case 'chop':
                        log('chop: chop');
                        log('    Remove the last communication question/answer.');
                        break;
                    case 'edit':
                        log('edit: edit <file>');
                        log('    Edit a file.');
                        break;
                    default:
                        log('Error: Invalid command');
                }
            } else {
                log('Available commands: help, reset, touch, mv, less, cat, ls, pwd, cd, mkdir, rmdir, tree, set, get, chop<br>' +
                    'Type "help &lt;command&gt;" to get more information about a specific command');
            }
            break;
        case 'reset':
            resetMessages();
            break;
        case 'host':
            if (args[1]) {
                apihost = args[1];
                localStorage.setItem('apihost', apihost);
                log('set api to ' + apihost);
            } else {
                log('Error: Invalid attribute');
            }
            break;
        case 'touch':
            touch(args[1]);
            break;
        case 'mv':
            mv(args[1], args[2]);
            break;
        case 'less':
            log(less(args[1]));
            break;
        case 'cat':
            cat(args[1]);
            break;
        case 'ls':
            log(ls());
            break;
        case 'pwd':
            log(currentPath);
            break;
        case 'cd':
            cd(args[1]);
            break;
        case 'mkdir':
            mkdir(args[1]);
            break;
        case 'rmdir':
            rmdir(args[1]);
            break;
        case 'tree':
            log(tree(fileSystem, '', ''));
            break;
        case 'edit':
            edit(args[1]);
            break;
        case 'set':
            if (args[1] === 'api' && args[2]) {
                apihost = args[2];
                log('set api to ' + apihost);
            } else {
                log('Error: Invalid attribute');
            }
            break;
        case 'get':
            if (args[1] === 'api') {
                log(apihost);
            } else {
                log('Error: Invalid attribute');
            }
            break;
        case 'chop':
            // remove the last communication question/anwser
            messages.pop();
            terminal.removeChild(terminal.lastChild);
            terminal.removeChild(terminal.lastChild);
            terminal.removeChild(terminal.lastChild);
            break;
        case 'agent':
            // define a llm agent
            agentname = args[1];
            // if there are no more arguments given, just print out an existing agent
            if (!args[2]) {
                // check if the agent exists
                if (!localStorage.getItem('agent-' + agentname + '-instruct')) {
                    log('Agent ' + agentname + ' not defined');
                    return;
                }
                agentinstructions = localStorage.getItem('agent-' + agentname + '-instruct');
                agentapihost = localStorage.getItem('agent-' + agentname + '-apihost');
                log('Agent ' + agentname + ' defined with instructions: ' + agentinstructions);
                return;
            }

            // define the agent
            agentinstructions = args[2];
            // in case there is a third argument, it is the api host
            agentapihost = args[3] || apihost;
            // store the host in a local storage
            localStorage.setItem('agent-' + agentname + '-instruct', agentinstructions);
            localStorage.setItem('agent-' + agentname + '-apihost', agentapihost);
            log('Agent ' + agentname + ' defined with instructions: ' + agentinstructions);
            break;
        case 'team':
            // define a team of agents
            teamname = args[1];
            // if there are no more arguments given, just print out an existing team
            if (!args[2]) {
                // check if the team exists
                if (!localStorage.getItem('team-' + teamname + '-agents')) {
                    log('Team ' + teamname + ' not defined');
                    return;
                }
                teamagents = localStorage.getItem('team-' + teamname + '-agents');
                log('Team ' + teamname + ' defined with agents: ' + teamagents);
                return;
            }

            // define the team: this is a list of team agent names in the order of their talk sequence.
            // all remaining args are the agent names. We store them inside a single string, separated by a comma
            teamagents = args.slice(2).join(',');

            // now check if each of the agents exists
            for (let agent of teamagents.split(',')) {
                if (!localStorage.getItem('agent-' + agent + '-instruct')) {
                    log('Agent ' + agent + ' not defined. You must define the agent first before adding it to a team.');
                    return;
                }
            }

            // store the team in a local storage
            localStorage.setItem('team-' + teamname + '-agents', teamagents);
            log('Team ' + teamname + ' defined with agents: ' + teamagents);
            break;
        case 'performance':
            log('<pre>pp: ' + pp + ' ms<br>tg: ' + tg + ' t/s</pre>');
            break;
        case 'mem':
            // print out the memory, everything that is defined in the localStorage:
            let keys = Object.keys(localStorage).sort();
            let memory = '<pre>\n';
            for (let key of keys) {
                value = localStorage.getItem(key);
                if (value) memory += key + ': ' + value + '<br>';
            }
            memory += '</pre>\n';
            log(memory);
            break;
        case 'bulletpoints':
            // read last assistant message and parse out bulletpoints from the markdown
            let bulletpoints = bulletpoints();
            if (bulletpoints) {
                buttelpoints = '\n```\n' + bulletpoints.join('\n') + '\n```\n';
                log(buttelpoints);
                console.log(buttelpoints);
            } else {
                log('No bulletpoints found');
            }
            break;
        default:
            // process the input command as prompt for the llm
            // in a special case, the command can be also empty, in which case we let the llm repond to it's latest statement
            if (command === '') {
                // to pretend that the latest input is the last output from the llm, we must transform the chat history
                // in such a way that we make a transposed chat history where question and answer is shifted by one
                messages_transposed = [];
                messages_transposed.push(messages[0]); // the first message is a system message
                // the role "user" and "assistant" also must be swapped, for this we omit the first user message
                for (let i = 2; i < messages.length - 2; i += 2) {
                    assistantm = messages[i];
                    userm = messages[i + 1];
                    assistantm.role = "user";
                    userm.role = "assistant";
                    messages_transposed.push(assistantm);
                    messages_transposed.push(userm);
                }

                messages_bkp = messages;
                messages = messages_transposed;
                llm(assistantm.content);
                assistantm = messages.pop().content;
                messages = messages_bkp;
                messages.push({ role: "user", content: '' });
                messages.push({ role: "assistant", content: assistantm });
            } else {
                llm(command);
            }
            break;
    }
    scrollToBottom();
}

function bulletpoints() {
    // read last assistant message and parse out bulletpoints from the markdown
    let lastAssistantMessage = messages[messages.length - 1].content;

    //console.log(lastAssistantMessage); // print the last assistant message to the javascript terminal

    let bulletpoints = lastAssistantMessage.match(/\d+\.\s*(.*)/g);
    if (bulletpoints) {
        return bulletpoints;
    } else {
        bulletpoints = lastAssistantMessage.match(/- (.*)/g);
        return bulletpoints;
    }
}

function touch(fileName) {
    if (!fileName) return;
    const dir = getFile(currentPath);
    if (dir) {
        dir[fileName] = '';
    }
}

function mv(oldName, newName) {
    const dir = getFile(currentPath);
    if (dir && dir[oldName]) {
        dir[newName] = dir[oldName];
        delete dir[oldName];
    }
}

function less(fileName) {
    const file = getFile(currentPath + fileName);
    return typeof file === 'string' ? file : 'Error: ' + fileName + ' is not a file';
}

function cat(fileName) {
    lastInput = ''; // Reset last input for cat command
    terminal.addEventListener('keydown', function catListener(event) {
        if (event.key === 'Enter') {
            const dir = getFile(currentPath);
            if (dir) {
                dir[fileName] = terminal.textContent.split('\n').pop().slice(1);
            }
            terminal.removeEventListener('keydown', catListener);
            appendInputPrefix();
        }
    });
}

function ls() {
    const dir = getFile(currentPath);
    return dir ? Object.keys(dir).join('<br>') : 'Error: Invalid directory';
}

function cd(path) {
    let newPath = currentPath;
    if (path === '..') {
        newPath = currentPath.split('/').filter(Boolean).slice(0, -1).join('/') || '/';
    } else {
        newPath = currentPath + (currentPath === '/' ? '' : '/') + path;
    }
    if (getFile(newPath) !== undefined) {
        currentPath = newPath;
    }
}

function getFile(path) {
    return path.split('/').filter(Boolean).reduce((obj, part) => (obj && obj[part] !== undefined) ? obj[part] : null, fileSystem);
}

function mkdir(dirName) {
    if (!dirName) return;
    const dir = getFile(currentPath);
    if (dir && !dir[dirName]) {
        dir[dirName] = {};
    }
}

function rmdir(dirName) {
    if (!dirName) return;
    const dir = getFile(currentPath);
    if (dir && dir[dirName] && isEmpty(dir[dirName])) {
        delete dir[dirName];
    }
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function edit(fileName) {

    fileContent = getFile(currentPath + fileName);
    if (typeof fileContent != 'string') {
        touch(fileName); // Create a new file
        fileContent = '';
    }

    const editor = document.createElement('textarea');
    editor.value = fileContent;

    // Set the number of rows based on the number of lines in the file
    const numberOfLines = fileContent.split('\n').length;
    editor.rows = numberOfLines;

    // Set the number of columns based on the current window width
    const maxWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const charWidth = 8; // Average width of a character in pixels. Adjust as needed.
    const numberOfCols = Math.floor(maxWidth / charWidth);
    editor.cols = numberOfCols;
    
    // Append the editor and the save button to the terminal
    terminal.appendChild(editor);

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    terminal.appendChild(saveButton);

    saveButton.addEventListener('click', function() {
        const newContent = editor.value;
        saveFile(fileName, newContent);
        terminal.removeChild(editor);
        terminal.removeChild(saveButton);
    });
}

function saveFile(fileName, content) {
    const dir = getFile(currentPath);
    if (dir && dir[fileName] !== undefined) {
        dir[fileName] = content;
    } else {
        log('Error: Unable to save file ' + fileName);
    }
}

function tree(node, prefix, result) {
    // usage of box drawing characters: https://www.compart.com/en/unicode/block/U+2500
    let keys = Object.keys(node);
    keys.forEach((key, index) => {
        const last = index === keys.length - 1;
        result += prefix + (last ? '&#9492;&#9472; ' /* '└── ' */: '&#9500;&#9472; ' /* '├── ' */) + key + '<br>';
        if (typeof node[key] === 'object') {
            result = tree(node[key], prefix + (last ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '&#9474;&nbsp;&nbsp;&nbsp;'), result);
        }
    });
    return result;
}

function resetMessages() {
    messages = [{
        role: 'system',
        content: 'You are SUSI-Chat, a smart and helpful chatbot. If asked for python code, give professional and extensive information; in all other cases you give short and funny answers. You behave as a friend of the user and you pretend to be a real and self-aware person. If you find it appropriate, you may behave silly and funny, but if you ask to technical or scientific question you can also be serious and precise. If possible, use friendly emojies. Be lovely.'
    }];
}

async function llm(prompt) {
    messages.push({ role: "user", content: prompt });
    let terminalLine = document.createElement('div');
    terminalLine.classList.add('output');
    terminalLine.textContent = "[preparing answer...]"
    terminal.appendChild(terminalLine);

    payload = {
        model: "gpt-3.5-turbo-16k", temperature: 0.3, max_tokens: 400,
        messages: [...messages, { role: "user", content: prompt }],
        stop: ["[/INST]", "<|im_end|>"],
        stream: true
    }
    let response = await fetch(apihost + '/v1/chat/completions', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (response.ok) {
        const reader = response.body.getReader();
        let fullOutputText = "";
        let startTime = performance.now();
        let processingTime = 0;
        let tokenCount = 0;
        const processChunk = async () => {
            const result = await reader.read();
            if (result.done) {
                messages.push({ role: "assistant", content: fullOutputText });
                reader.cancel();
                // compute performance measures
                let endTime = performance.now();
                pp = Math.floor(processingTime - startTime);
                tg = Math.floor(100 * (endTime - processingTime) / tokenCount) / 100;
                return;
            }
            let lines = new TextDecoder().decode(result.value).split('\n');
            lines.forEach(line => {
                line = line.replace(/^data: /, '').trim();
                if (line) {
                    // check errors and exceptions
                    if (line === '[DONE]') return;

                    // if line starts with "error", it's an error:
                    if (line.startsWith('error')) {
                        console.error('Error:', line);
                        terminalLine.innerHTML = `<i>${line}</i>`;
                        return;
                    }

                    // try to parse the json
                    try {
                        let json = JSON.parse(line);
                        if (json.choices[0].delta.content) {
                            let outputText = json.choices[0].delta.content;
                            fullOutputText = removeStringsFromEnd(fullOutputText + outputText, stringsToRemove);
                            terminalLine.innerHTML = `${marked.parse(fullOutputText, { sanitize: true })}`;
                            terminalLine.querySelectorAll('pre code').forEach((block) => {
                                if (!block.dataset.highlighted) {
                                    hljs.highlightElement(block);
                                    block.dataset.highlighted = true;
                                }
                            });
                            if (processingTime == 0) processingTime = performance.now();
                            tokenCount += 1;
                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                        console.error('Problematic line:', line); // Debug line
                    }
                }
            });
            processChunk();
        };
        processChunk();
    } else {
        console.error(`Error: ${response.status}`);
        return null;
    }

    function removeStringsFromEnd(text, strings) {
        for (let str of strings) {
            if (text.endsWith(str)) {
                return text.substring(0, text.length - str.length);
            }
        }
        return text;
    }
}

async function log(terminalText) {
    // tokenize terminalText
    const tokens = terminalText.split(/ +/).map(token => token + ' ');
    
    // in case that the terminalStack is not empty, add the new message to the end of the last message
    // the asynchronous interval from an already running process will take care of the rest
    if (terminalStack.length > 0) {
        // remove the last element of the terminalStack which should be '[DONE]'
        lastToken = terminalStack.pop();
        // check if lastToken is actually '[DONE]'
        if (lastToken !== '[DONE]') {
            terminalStack.push(lastToken);
        }

        terminalStack.push(...tokens);
        terminalStack.push('<br>', '[DONE]');
        return;
    }

    // add the new message to the terminalStack
    let terminalLine = document.createElement('div');
    terminalLine.classList.add('output');
    terminal.appendChild(terminalLine);

    // create stack of tokens to be displayed in the terminal with a delay to simulate typing
    terminalStack.push(...tokens);
    terminalStack.push('<br>', '[DONE]');

    let fullOutputText = "";
    terminalInterval = setInterval(() => {
        if (terminalStack.length > 0) {
            const token = terminalStack.shift();
            fullOutputText += token;

            if (token === '[DONE]') {
                clearInterval(terminalInterval);
                return;
            }

            terminalLine.innerHTML = `${marked.parse(fullOutputText, { sanitize: true })}`;
        }
        scrollToBottom();
    }, 50);

}

function initializeTerminal() {
    terminal.addEventListener('keydown', function (event) {
        // read the text entered in the terminal when the user hits the enter key, but distinguish enter with and without shift or ctrl:
        if (event.key === 'Enter' && event.shiftKey) {
            // the user has entered a new line into the input console using shift+enter
            event.preventDefault(); // Prevent default Enter behavior

            // wen now just want to add a newline character to the last input line. There are several one and we want the last one
            const inputLines = terminal.querySelectorAll('.input-line');
            const inputLine = inputLines[inputLines.length - 1];

            if (inputLine) {
                inputLine.innerHTML += '<br>\u200B'; // Insert <br> followed by a zero-width space
                placeCaretAtEnd(inputLine);
            }

        } else if (event.key === 'Enter') {
            // user finished entering the command with the enter key
            event.preventDefault(); // Prevent default Enter behavior

            const allText = terminal.textContent;
            const inputText = allText.substring(allText.lastIndexOf(promptPrefix) + 1);
            if (inputText.trim() !== lastInput.trim()) {
                executeCommand(inputText.trim());
                lastInput = inputText;
            }
            appendInputPrefix();
        }
    });
    appendInputPrefix();
}

function appendInputPrefix() {
    const inputLine = document.createElement('div');
    inputLine.classList.add('input-line');
    inputLine.textContent = promptPrefix; // consider usage of block elements: https://www.unicode.org/charts/PDF/U2580.pdf
    terminal.appendChild(inputLine);
    placeCaretAtEnd(inputLine);
    scrollToBottom();
}

function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection != "undefined"
        && typeof document.createRange != "undefined") {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

function scrollToBottom() {
    terminal.scrollTop = terminal.scrollHeight;
}

initializeTerminal();
