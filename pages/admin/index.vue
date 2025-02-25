<script setup>
definePageMeta({
	layout: 'admin-layout',
});

const mockData = [
	{
		title: 'ร่างพระราชบัญญัติแก้ไขเพิ่มเติมประมวลกฎหมายแพ่งและพาณิชย์',
		votingdate: '2023-12-21',
		createdat: '2023-12-31',
		assembly: 'สภาผู้แทนราษฎร-26',
		result: 'ผ่าน',
		source: 'Link',
		status: 'Published',
	},
	{
		title: 'ร่างพระราชบัญญัติแก้ไขเพิ่มเติมประมวลกฎหมายแพ่งและพาณิชย์',
		votingdate: '2023-12-21',
		createdat: '2023-12-31',
		assembly: 'สภาผู้แทนราษฎร-26',
		result: 'ผ่าน',
		source: 'Link',
		status: 'Unpublished - Error',
	},
];
</script>

<template>
	<div class="!p-10 h-dvh !bg-[#F4F4F4] !pt-[90px]">
		<ClientOnly fallback-tag="span" fallback="Loading...">
			<cv-breadcrumb noTrailingSlash>
				<cv-breadcrumb-item class="text-[#0F62FE]">All Data</cv-breadcrumb-item>
				<cv-breadcrumb-item>Voting</cv-breadcrumb-item>
			</cv-breadcrumb>

			<h1 class="!font-normal !mb-12 !mt-4">Voting</h1>

			<div>
				<cv-data-table pagination title="Voting" helperText="Description">
					<template #headings>
						<cv-data-table-heading
							id="sb-title"
							heading="Title"
							sortable
							order="ascending"
						/>
						<cv-data-table-heading
							id="sb-votingdate"
							heading="Voting Date"
							sortable
						/>
						<cv-data-table-heading
							id="sb-createdat"
							heading="Created At"
							sortable
						/>
						<cv-data-table-heading
							id="sb-assembly"
							heading="Assembly"
							sortable
						/>
						<cv-data-table-heading id="sb-result" heading="Result" sortable />
						<cv-data-table-heading id="sb-source" heading="Source" sortable />
						<cv-data-table-heading id="sb-status" heading="Status" sortable />
					</template>
					<template #data>
						<cv-data-table-row
							:id="row.name"
							:key="row.name"
							:value="row.name"
							v-for="(row, i) in mockData"
						>
							<cv-data-table-cell
								><a :href="`/voting/${i + 1}`" class="!text-black underline">{{
									row.title
								}}</a></cv-data-table-cell
							>
							<cv-data-table-cell>{{ row.votingdate }}</cv-data-table-cell>
							<cv-data-table-cell>{{ row.createdat }}</cv-data-table-cell>
							<cv-data-table-cell>{{ row.assembly }}</cv-data-table-cell>
							<cv-data-table-cell>{{ row.result }}</cv-data-table-cell>
							<cv-data-table-cell>{{ row.source }}</cv-data-table-cell>
							<cv-data-table-cell
								:class="{
									'!text-[#DA1E28]': row.status == 'Unpublished - Error',
								}"
								>{{ row.status }}</cv-data-table-cell
							>
						</cv-data-table-row>
					</template>
				</cv-data-table>
			</div>
		</ClientOnly>
	</div>
</template>

<style scoped></style>
