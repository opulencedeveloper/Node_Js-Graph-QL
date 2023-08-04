const { buildSchema } = require("graphql");

//type => is the Data type
//'!' means required,
//schema: defines the type of action, mutation means creating, deleting, or editing data
//Note that. 'UserInputData', RootMutation, userInput, createUser() can be any names,
//':' is the type of data you are returning
//'ID', type, schema, mutation is coming from grqaphql
//createUser(userInput: UserInputData): User!, means that 'createUser(userInput: UserInputData)' is of
//type User, which means it will return a user, this is the data the makes a request to createUser()
module.exports = buildSchema(`
    type Post {
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type User {
        _id: ID!
        name: String!
        email: String!
        password: String
        status: String!
        posts: [Post!]!
    }

    type AuthData {
        token: String!
        userId: String!
    }

    type PostData {
        posts: [Post!]!
        totalPosts: Int!
    }

    input UserInputData {
        email: String!
        name: String!
        password: String!
    }

    input PostInputData {
        title: String!
        content: String!
        imageUrl: String!
    }

    type RootQuery {
        login(email: String!, password: String!): AuthData!
        posts(page: Int): PostData!
        post(id: ID!): Post!
        user: User!
    }

    type RootMutation {
        createUser(userInput: UserInputData): User!
        createPost(postInput: PostInputData): Post!
        updatePost(id: ID!, postInput: PostInputData): Post!
        deletePost(id: ID!): Boolean
        updateStatus(status: String!): User!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);



//schema => must be here, becuase ot holds the basic crud operation here.
//'query', for reading data actions...
//'mutation' to create, delete, edit data actions...
// and 'subscription' which was not used here, because it's for web socket
//the query key only holds query actions, like getting data
//mutation key holds mutation, like create, delete, edit actions
