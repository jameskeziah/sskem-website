import {defineArrayMember, defineField, defineType} from 'sanity'

type PublicationValue = {
  state?: 'draft' | 'inReview' | 'published' | 'retired'
  validFrom?: string
  validUntil?: string
}

export const publication = defineType({
  name: 'publication',
  title: 'Publication control',
  type: 'object',
  description:
    'Public release metadata only. The website also requires an external receipt for this exact document revision and public-output digest. Approval evidence and approver identities remain outside Sanity.',
  options: {
    collapsible: true,
    collapsed: false,
  },
  fields: [
    defineField({
      name: 'state',
      title: 'Publication state',
      type: 'string',
      initialValue: 'draft',
      options: {
        layout: 'radio',
        list: [
          {title: 'Draft', value: 'draft'},
          {title: 'In review', value: 'inReview'},
          {title: 'Published', value: 'published'},
          {title: 'Retired', value: 'retired'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'approvalRecordIds',
      title: 'Approval record IDs',
      type: 'array',
      description:
        'Opaque claim IDs only. Include every claim needed by the displayed fields. Do not enter approver identities, evidence or internal notes.',
      of: [
        defineArrayMember({
          type: 'string',
          validation: (rule) =>
            rule.regex(/^claim-[a-z0-9-]+$/, {
              name: 'claim approval ID',
              invert: false,
            }),
        }),
      ],
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as PublicationValue | undefined

          if (parent?.state === 'published' && (!Array.isArray(value) || value.length === 0)) {
            return 'At least one approval record ID is required before this content can be marked published.'
          }

          if (Array.isArray(value) && new Set(value).size !== value.length) {
            return 'Approval record IDs must be unique.'
          }

          return true
        }),
    }),
    defineField({
      name: 'validFrom',
      title: 'Valid from',
      type: 'datetime',
      description: 'Start of the public display window. Required for published content.',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as PublicationValue | undefined

          if (parent?.state === 'published' && !value) {
            return 'Valid from is required before this content can be marked published.'
          }

          return true
        }),
    }),
    defineField({
      name: 'validUntil',
      title: 'Valid until',
      type: 'datetime',
      description: 'End of the public display window. Required for published content.',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as PublicationValue | undefined

          if (parent?.state === 'published' && !value) {
            return 'Valid until is required before this content can be marked published.'
          }

          if (!value || !parent?.validFrom) {
            return true
          }

          return new Date(value).getTime() > new Date(parent.validFrom).getTime()
            ? true
            : 'Valid until must be later than valid from.'
        }),
    }),
    defineField({
      name: 'contentOwnerRole',
      title: 'Content owner role',
      type: 'string',
      description:
        'Use an accountable school role, not a person name (for example, Admissions Office).',
      validation: (rule) => rule.required().min(2).max(100),
    }),
    defineField({
      name: 'lastReviewedAt',
      title: 'Last reviewed at',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
  ],
})
