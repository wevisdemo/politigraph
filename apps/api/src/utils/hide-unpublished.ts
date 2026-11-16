import type { ApolloServerPlugin, BaseContext } from '@apollo/server';
import { hideUnpublishedInFilters } from '@politigraph/graphql/hide-unpublished-filters';
import { getOperationAST } from 'graphql';

export const hideUnpublishedPlugin: ApolloServerPlugin<BaseContext> = {
	async requestDidStart({ contextValue }) {
		if ('token' in contextValue) return;

		return {
			async didResolveOperation(requestContext) {
				const { schema, document, request, operationName } = requestContext;
				const rewritten = hideUnpublishedInFilters(
					schema,
					document,
					request.variables,
					operationName,
				);

				// Apollo executes requestContext.document, and hooks can't return a replacement
				Object.assign(requestContext, {
					document: rewritten,
					operation: getOperationAST(rewritten, operationName),
				});
			},
		};
	},
};
