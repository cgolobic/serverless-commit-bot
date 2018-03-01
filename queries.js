const GET_LOGIN = `
"query {
  viewer {
    login
  }
}"
`;

const GET_TREE = `
query($repository: String, $owner: String, $root: String) { 
  repository(name: $repository, owner: $owner) {
    object(expression: $root) {
      ... on Tree {
        oid
        entries {
          name,
          oid,
          type
        }
      }
    }
  }
}
`


module.exports = {
  GET_LOGIN,
  GET_TREE
};
