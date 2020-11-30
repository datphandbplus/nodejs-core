module.exports = {
  "parser": "babel-eslint",
  "extends": "google",
  "parserOptions": {
    "ecmaVersion": 2017
  },
  "env": {
    "node": true,
    "amd": true,
    "es6": true,
    "browser": true
  },
  "rules":{
    "require-await": 2,
    "key-spacing": 0,
    "new-cap": 0,
    "one-var": [2, "never"],
    "prefer-const": 2,
    "max-len": [2, 140],
    "arrow-parens": [2, "as-needed"],
    "object-curly-spacing": [2, "always"],
    "computed-property-spacing": [2, "always"],
    "quotes": [2, "single"],
    "semi": [2, "always"],
    "operator-assignment": [2, "always"],
    "object-shorthand": [2, "always"],
    "block-spacing": [2, "always"],
    "global-require": 2,
    "no-var": 2,
    "no-unused-vars": 2,
    "no-use-before-define": 2,
    "no-undef": 2,
    "no-tabs": 0,
    "no-const-assign": 2,
    "no-return-await": 2,
    "no-extra-semi": 2,
    "no-console": 2,
    "no-debugger": 2,
    "no-duplicate-imports": 2,
    "no-else-return": 2,
    "no-dupe-keys": 2,
    "no-duplicate-case": 2,
    "no-sparse-arrays": 2,
    "no-alert": 2,
    "no-shadow": 2,
    "no-mixed-requires": 2,
    "valid-jsdoc": [2, {
      "requireParamDescription": false,
      "requireReturnDescription": false,
    }],
    "require-jsdoc": [2, {
      "require": {
        "FunctionDeclaration": true,
        "MethodDefinition": true,
        "ClassDeclaration": false,
        "ArrowFunctionExpression": false,
        "FunctionExpression": false
      }
    }],
    "indent": [
      2,
      "tab",
      {
        "MemberExpression": 0,
        "SwitchCase": 1
      }
    ],
    "padded-blocks": [
      2,
      {
        "classes": "always"
      }
    ],
    "space-before-function-paren": [
      2,
      {
        "anonymous": "never",
        "named": "never",
        "asyncArrow": "always"
      }
    ],
    "no-unused-expressions": [
      2,
      {
        "allowShortCircuit": true,
        "allowTernary": true
      }
    ],
    "comma-dangle": [
      2,
      {
        "arrays": "always-multiline",
        "objects": "always-multiline",
        "imports": "never",
        "exports": "never",
        "functions": "never"
      }
    ],
    "array-bracket-newline": [
      2,
      {
        "multiline": true,
        "minItems": 4
      }
    ],
    "array-bracket-spacing": [
      2,
      "always",
      {
        "objectsInArrays": false,
        "arraysInArrays": false
      }
    ],
    "arrow-spacing": [
      2,
      {
        "before": true,
        "after": true
      }
    ],
    "semi-spacing": [
      2,
      {
        "before": false,
        "after": true
      }
    ]
  }
};