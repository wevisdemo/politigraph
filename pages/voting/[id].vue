<script setup>
definePageMeta({
	layout: 'admin-layout',
});

const mockData = [
	{
		name: 'จุติ ไกรฤกษ์',
		party: 'รวมไทยสร้างชาติ',
		vote: 'เห็นด้วย',
	},
];

const route = useRoute();
const isShowNotification = ref(true);
const isShowNotificationError = ref(true);

console.log(route);
</script>

<template>
	<div class="!p-10 min-h-dvh !bg-[#F4F4F4] !pt-[90px]">
		<ClientOnly fallback-tag="span" fallback="Loading...">
			<cv-breadcrumb noTrailingSlash>
				<cv-breadcrumb-item class="text-[#0F62FE]">All Data</cv-breadcrumb-item>
				<cv-breadcrumb-item class="text-[#0F62FE]">Voting</cv-breadcrumb-item>
				<cv-breadcrumb-item
					>ร่างพระราชบัญญัติแก้ไขเพิ่มเติมประมวลกฎหมายแพ่งและพาณิชย์</cv-breadcrumb-item
				>
			</cv-breadcrumb>

			<h3 class="!font-normal !mb-12 !mt-4">
				ร่างพระราชบัญญัติแก้ไขเพิ่มเติมประมวลกฎหมายแพ่งและพาณิชย์
			</h3>

			<cv-inline-notification
				v-if="isShowNotification"
				lowContrast
				kind="warning"
				title="This item is unpublished"
				subTitle="It is not visible in public view."
				@close="isShowNotification = false"
			/>

			<cv-inline-notification
				v-if="route.params.id == 2 && isShowNotificationError"
				lowContrast
				kind="error"
				title="Error: Data Validation Failed"
				@close="isShowNotificationError = false"
			/>

			<div class="flex gap-8">
				<div class="bg-white !p-4 basis-2/4">
					<div class="flex justify-between items-center">
						<h4>Voting Details</h4>
						<div>
							<cv-button default="Save Changes">Save Changes</cv-button>
						</div>
					</div>

					<form @submit.prevent="() => {}">
						<div class="!mb-3">
							<cv-text-input label="Title" placeholder=""> </cv-text-input>
						</div>

						<div class="!mb-3">
							<cv-text-input label="Nickname" placeholder=""> </cv-text-input>
						</div>

						<div class="!mb-3">
							<cv-date-picker
								dateLabel="Date label"
								invalidMessage=""
								:value="new Date().toLocaleDateString()"
							>
							</cv-date-picker>
						</div>

						<div class="!mb-3">
							<cv-text-input label="Involving Assembly" placeholder="">
							</cv-text-input>
						</div>

						<div class="!mb-3">
							<cv-select label="Result">
								<cv-select-option
									disabled
									selected
									hidden
									value="placeholder-item"
									>Choose an option</cv-select-option
								>
								<cv-select-option value="ผ่าน">ผ่าน</cv-select-option>
							</cv-select>
						</div>

						<div class="!mb-3">
							<cv-select label="Winning Condition">
								<cv-select-option
									disabled
									selected
									hidden
									value="placeholder-item"
									>Choose an option</cv-select-option
								>
								<cv-select-option value="ได้เสียงข้างมากในที่ประชุม"
									>ได้เสียงข้างมากในที่ประชุม</cv-select-option
								>
							</cv-select>
						</div>

						<div class="!mb-3">
							<cv-text-area label="Description" placeholder=""> </cv-text-area>
						</div>

						<div class="!mb-3">
							<cv-text-input label="Source URL" placeholder=""> </cv-text-input>
						</div>

						<p class="!font-bold !mb-3">Related Documents</p>

						<div class="!mb-3">
							<cv-text-input label="Document Tiltle" placeholder="">
							</cv-text-input>
						</div>

						<div class="!mb-3">
							<cv-text-input label="Document URL" placeholder="">
							</cv-text-input>
						</div>

						<div class="!mb-3">
							<cv-button default="Add Another Item" kind="tertiary"
								>Add Another Item</cv-button
							>
						</div>

						<div class="!mb-3 text-right">
							<cv-button default="Save Changes">Save Changes</cv-button>
						</div>
					</form>
				</div>

				<div class="basis-2/4">
					<cv-data-table
						pagination
						title="Voting"
						helperText="Vote Summary: เห็นด้วย 400, ไม่เห็นด้วย 100, งดออกเสียง 2"
					>
						<template #headings>
							<cv-data-table-heading
								id="sb-title"
								heading="#"
								sortable
								order="ascending"
							/>
							<cv-data-table-heading
								id="sb-politician"
								heading="Politician"
								sortable
							/>
							<cv-data-table-heading id="sb-party" heading="Party" sortable />
							<cv-data-table-heading id="sb-vote" heading="Vote" sortable />
						</template>
						<template #data>
							<cv-data-table-row
								v-for="(row, i) in mockData"
								:id="row.name"
								:key="row.name"
								:value="row.name"
							>
								<cv-data-table-cell>{{ i + 1 }}</cv-data-table-cell>
								<cv-data-table-cell>{{ row.name }}</cv-data-table-cell>
								<cv-data-table-cell>{{ row.party }}</cv-data-table-cell>
								<cv-data-table-cell>{{ row.vote }}</cv-data-table-cell>
							</cv-data-table-row>
						</template>
					</cv-data-table>
				</div>
			</div>
		</ClientOnly>
	</div>
</template>

<style scoped></style>
