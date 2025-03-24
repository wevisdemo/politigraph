<template>
	<cv-tile>
		<div class="flex flex-col gap-2">
			<h1>Politigraph - Under Construction</h1>
			<cv-link href="/graphql">Enter GraphQL Sandbox</cv-link>

			<h2>Schema Diagram</h2>
			<ul>
				<li>Purple Box = Node</li>
				<li>Transparent box = Union / Interface</li>
				<li>Yellow Box = Description</li>
				<li>Solid Arrow = Relationship</li>
				<li>Dashed Arrow = In union / Inherit from interface</li>
			</ul>
			<schema-diagram />
		</div>
	</cv-tile>
</template>
