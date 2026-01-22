import { INodeProperties } from 'n8n-workflow';

export const fileUploadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['fileUpload'],
			},
		},
		options: [
			{
				name: 'Upload from URL',
				value: 'uploadUrl',
				description: 'Download and upload a file from a URL',
				action: 'Upload file from URL',
			},
			{
				name: 'Upload File Stream',
				value: 'uploadStream',
				description: 'Upload a file using binary stream (ideal for large files)',
				action: 'Upload file stream',
			},
			{
				name: 'Upload Base64',
				value: 'uploadBase64',
				description: 'Upload a Base64 encoded file (suitable for small files ≤10MB)',
				action: 'Upload Base64 file',
			},
		],
		default: 'uploadUrl',
	},
];

export const fileUploadFields: INodeProperties[] = [
	// URL Upload Parameters
	{
		displayName: 'File URL',
		name: 'fileUrl',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['fileUpload'],
				operation: ['uploadUrl'],
			},
		},
		default: '',
		placeholder: 'https://example.com/image.jpg',
		description: 'URL of the file to download and upload (max 100MB, 30s timeout)',
	},

	// Stream Upload Parameters
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['fileUpload'],
				operation: ['uploadStream'],
			},
		},
		default: 'data',
		description: 'Name of the binary property containing the file to upload',
	},

	// Base64 Upload Parameters
	{
		displayName: 'Base64 Data',
		name: 'base64Data',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['fileUpload'],
				operation: ['uploadBase64'],
			},
		},
		default: '',
		placeholder: 'data:image/png;base64,iVBORw0KGgo...',
		description: 'Base64 encoded file data (max 10MB recommended). Data size increases by 33%.',
		typeOptions: {
			rows: 4,
		},
	},

	// Common Parameters (all upload types)
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['fileUpload'],
			},
		},
		default: '',
		placeholder: 'my-file.jpg',
		description: 'Custom filename. If omitted, a random name is generated. Same filename overwrites previous file.',
	},
	{
		displayName: 'Upload Path',
		name: 'uploadPath',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['fileUpload'],
			},
		},
		default: '',
		placeholder: 'images',
		description: 'Optional directory path for organizing files',
	},

	// Important Notice
	{
		displayName: 'Important: Uploaded files are automatically deleted after 3 days. File uploads are free.',
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: ['fileUpload'],
			},
		},
		default: '',
	},
];
