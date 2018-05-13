'use strict';

module.exports = {
    "prompts": {
        "name"       : {
            "type"    : "string",
            "required": true,
            "message" : "Project name"
        },
        "version"     : {
            "type"    : "string",
            "message" : "Project version",
            "default" : "1.0.0"
        },
        "description": {
            "type"    : "string",
            "required": false,
            "message" : "Project description",
            "default" : "A new mini program project"
        },
        "author"     : {
            "type"   : "string",
            "message": "Author",
            "default" : "Yeanzhi"
        },
        "test": {
            "type": "confirm",
            "message": "Setup unit tests with jest?"
        }
    },
    "filters":{
        "__tests__/**/*": "test",
        "test/**/*": "test"
    },
    "completeMessage": "To get started:\n\n  cd {{destDirName}}\n  npm install\n  npm run dev\n\nDocumentation can be found at https://github.com/waka-templates/wechat-mp"
}
