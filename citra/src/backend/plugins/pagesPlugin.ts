import { asset } from '@absolutejs/absolute';
import { handleReactPageRequest } from '@absolutejs/absolute/react';
import { Elysia } from 'elysia';
import { Documentation } from '../../frontend/react/pages/Documentation';
import { Home } from '../../frontend/react/pages/Home';
import { Testing } from '../../frontend/react/pages/Testing';

export const pagesPlugin = (manifest: Record<string, string>) =>
	new Elysia()
		.get('/', ({ request }) =>
			handleReactPageRequest({
				index: asset(manifest, 'HomeIndex'),
				Page: Home,
				request
			})
		)
		.get('/testing', ({ request }) =>
			handleReactPageRequest({
				index: asset(manifest, 'TestingIndex'),
				Page: Testing,
				request
			})
		)
		.get('/documentation', ({ request }) =>
			handleReactPageRequest({
				index: asset(manifest, 'DocumentationIndex'),
				Page: Documentation,
				request
			})
		);
