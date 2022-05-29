import { getSdk } from "./gql"
import { GraphQLClient } from "./graphqlRequestLoader"

export const ANNICT_GRAPHQL_ENDPOINT = "https://api.annict.com/graphql"

export const generateGqlClient = (accessToken: string) => {
  const client = new GraphQLClient(ANNICT_GRAPHQL_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  return getSdk(client)
}
