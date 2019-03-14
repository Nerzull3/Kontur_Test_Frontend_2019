const { getAllFilePathsWithExtension, readFile } = require('./fileSystem');
const { readLine } = require('./console');
const pathModule = require('path');

const COMMENTS = [];
const _ETALON_MAX_SPACES = {
    importance: 1,
    user: 10,
    date: 10,
    comment: 50,
    fileName: 15
};
const _REGEXPS = {
    comment: /\/\/[ ]*TODO[ ]*:?[ ]*.*?[ ]*;[ ]*[\d-]*[ ]*;[ ]*.*\n?|\/\/ TODO[ ]*:?[ ]*.*\n?/gi,
    date: /^\d{4}$|^\d{4}-\d{2}$|^\d{4}-\d{2}-\d{2}$/,
    commentInfo: /\/\/[ ]*TODO[ ]*:?[ ]*(.*?)[ ]*;[ ]*([\d-]*)[ ]*;[ ]*(.*)|\/\/ TODO[ ]*:?[ ]*(.*)\n?/i
};

app();

function app() {
    const files = getFiles();
    const comments = files.map(file => {
        return {
            fileName: file.fileName,
            comments: file.content.match(_REGEXPS.comment)
        };
    });

    COMMENTS.push(...getAllCorrectComments(comments));
    console.log('Please, write your command!');
    readLine(processCommand);
}

function getFiles() {
    const filePaths = getAllFilePathsWithExtension(process.cwd(), 'js');
    return filePaths.map(path => {
        return {
            fileName: pathModule.basename(path),
            content: readFile(path)
        };
    });
}

function processCommand(command) {
    const argument = command.split(/[ ]+/)[1];
    if (!argument) {
        handleCommandsWithoutArgument(command);
    } else {
        handleCommandsWithArgument(command, argument);
    }
}

function handleCommandsWithoutArgument(command) {
    switch (command) {
        case 'exit':
            process.exit(0);
            break;
        case 'show':
            selectComments();
            break;
        case 'important':
            selectComments('importance', '!');
            break;
        default:
            console.log('wrong command');
    }
}

function handleCommandsWithArgument(command, argument) {
    if (command.startsWith('user')) {
        selectComments('user', argument);
    } else if (command.startsWith('sort')) {
        handleSort(argument);
    } else if (command.startsWith('date')) {
        if (!_REGEXPS.date.test(argument)) {
            console.log('incorrect argument');
            return;
        }
        render(COMMENTS.filter(data => data.date >= argument));
    } else {
        console.log('wrong command');
    }
}

function selectComments(pattern='', parameter='') {
    if (pattern === '') {
        render(COMMENTS);
    } else {
        const result = COMMENTS.filter(data => 
            data[pattern].toLowerCase().startsWith(parameter.toLowerCase())
        );
        render(result);
    }
}

function handleSort(argument) {
    switch (argument) {
        case 'importance':
            render(COMMENTS.sort((c1, c2) => c2.importancePower - c1.importancePower));
            break;
        case 'user':
            const namedUsers = COMMENTS
                .filter(data => data.user !== '')
                .sort((c1, c2) => c1.user.toLowerCase().localeCompare(c2.user.toLowerCase()));
            const anonymous = COMMENTS.filter(data => data.user === '');
            render(namedUsers.concat(anonymous));
            break;
        case 'date':
            render(COMMENTS.sort((c1, c2) => c2.date.localeCompare(c1.date)));
            break;
        default:
            console.log('incorrect argument');
            break;
    }
}

function getAllCorrectComments(files) {
    const result = [];
    for (const file of files) {
        if (file.comments !== null) {
            for (const comment of file.comments) {
                const splitted = _REGEXPS.commentInfo.exec(comment);
                if (splitted !== null) {
                    result.push(createCommentObject(splitted, file.fileName));
                }
            }
        }
    }

    return result;
}

function createCommentObject(splitted, fileName) {
    const comment = {
        importance: '',
        user: splitted[1] || '',
        date: splitted[2] || '',
        comment: splitted[3] || splitted[4] || '',
        fileName
    };
    Object.defineProperty(comment, 'importancePower', {
        value: getImportancesCount(comment.comment)
    });
    if (comment.importancePower > 0) {
        comment.importance = '!';
    }

    return comment;
}

function getImportancesCount(comment) {
    let count = 0;
    for (let i = comment.length - 1; i >= 0; i--) {
        if (comment[i] !== '!') {
            break;
        }
        count++;
    }

    return count;
}

function getMaxLength(key, commentsInfo) {
    return commentsInfo
        .map(userData => userData[key])
        .sort((a, b) => a.length - b.length)
        .pop()
        .length;
}

function setSpaces(commentsInfo, currentMaxSpaces) {
    for (const key in currentMaxSpaces) {
        if (currentMaxSpaces.hasOwnProperty(key)) {
            const maxLength = getMaxLength(key, commentsInfo);
            currentMaxSpaces[key] = maxLength <= _ETALON_MAX_SPACES[key]
                ? Math.max(maxLength, currentMaxSpaces[key])
                : _ETALON_MAX_SPACES[key];
        }
    }
}

function render(commentsInfo) {
    const currentMaxSpaces = {
        importance: 1,
        user: 4,
        date: 4,
        comment: 7,
        fileName: 8
    };

    if (commentsInfo.length > 0) {
        setSpaces(commentsInfo, currentMaxSpaces);
    }

    let result = getFormatted(currentMaxSpaces, '!', 'user', 'date', 'comment', 'fileName');
    const lineLength = result.length - 1;

    result += drawLine(lineLength);
    if (commentsInfo.length > 0) {
        for (const data of commentsInfo) {
            const {importance, user, date, comment, fileName} = checkMaxLength(data);
            result += getFormatted(currentMaxSpaces, importance, user, date, comment, fileName);
        }
        result += drawLine(lineLength);
    }

    console.log(result);
}

function getFormatted(curMaxSpaces, importance, user, date, comment, fileName) {
    return `  ${importance}${' '.repeat(curMaxSpaces.importance - importance.length)}  |` +
        `  ${user}${' '.repeat(curMaxSpaces.user - user.length)}  |` +
        `  ${date}${' '.repeat(curMaxSpaces.date - date.length)}  |` +
        `  ${comment}${' '.repeat(curMaxSpaces.comment - comment.length)}  |` +
        `  ${fileName}${' '.repeat(curMaxSpaces.fileName - fileName.length)}  \n`;
}

function drawLine(length) {
    return '-'.repeat(length) + '\n';
}

function checkMaxLength(user) {
    const correctData = user;
    for (const prop of Object.keys(user)) {
        if (user[prop].length > _ETALON_MAX_SPACES[prop]) {
            correctData[prop] = user[prop].substring(0, _ETALON_MAX_SPACES[prop] - 3) + '...';
        }
    }

    return correctData;
}
