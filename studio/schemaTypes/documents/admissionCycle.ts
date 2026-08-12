import {defineField, defineType} from 'sanity'

export const admissionCycle = defineType({
  name: 'admissionCycle',
  title: 'Admission cycle',
  type: 'document',
  fields: [
    defineField({
      name: 'institution',
      title: 'Institution',
      type: 'string',
      description: 'Use only the approved institution name for this admissions cycle.',
      validation: (rule) => rule.required().min(5).max(160),
    }),
    defineField({
      name: 'academicYear',
      title: 'Academic year',
      type: 'string',
      description: 'For example: 2027-28.',
      validation: (rule) => rule.required().min(7).max(12),
    }),
    defineField({
      name: 'publicStatus',
      title: 'Public admissions status',
      type: 'string',
      description: 'Short public-facing status, for example: Enquiries are open.',
      validation: (rule) => rule.required().min(3).max(160),
    }),
    defineField({
      name: 'publicMessage',
      title: 'Public message',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required().min(20).max(600),
    }),
    defineField({
      name: 'verifiedAt',
      title: 'Admissions facts verified at',
      type: 'datetime',
      description: 'When the public admissions facts were most recently verified.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publication',
      title: 'Publication control',
      type: 'publication',
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    {
      title: 'Academic year, newest first',
      name: 'academicYearDesc',
      by: [{field: 'academicYear', direction: 'desc'}],
    },
  ],
  preview: {
    select: {
      title: 'institution',
      year: 'academicYear',
      status: 'publicStatus',
    },
    prepare({title, year, status}) {
      return {title, subtitle: [year, status].filter(Boolean).join(' | ')}
    },
  },
})
