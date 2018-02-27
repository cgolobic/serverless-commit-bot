## Sample HTTP request POST body
```
{
	"message": "updating multiple files",
	"files": [
		{
			"path": "myfile.json",
			"content": {
				"text1": "this is some text",
				"num1": 111
			}
		},
		{
			"path": "people.json",
			"content": {
				"object1": {
					"name": "abc",
					"age": 123
				},
				"object2": {
					"name": "xyz",
					"age": 456
				}
			}
		}
	]
}
```