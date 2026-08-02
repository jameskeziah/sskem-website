import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  AspectRatio,
  Cluster,
  Divider,
  Grid,
  PageContainer,
  ReadingContainer,
  Section,
  Stack,
  VisuallyHidden,
} from "@/components/layout";
import {
  Caption,
  DownloadLink,
  ExternalLink,
  Eyebrow,
  Heading,
  Lead,
  List,
  Quote,
  Text,
  TextLink,
} from "@/components/typography";
import {
  Button,
  Checkbox,
  ErrorSummary,
  FormField,
  IconButton,
  Input,
  RadioGroup,
  SearchInput,
  Select,
  Textarea,
} from "@/components/controls";
import {
  Accordion,
  Alert,
  ContactCard,
  DataTable,
  DisclosureDocumentCard,
  DocumentList,
  EmptyState,
  ErrorState,
  FacultyCard,
  GalleryCard,
  LeadershipCard,
  Pagination,
  ProgrammeCard,
  ResponsiveImage,
  Statistic,
  VideoEmbed,
} from "@/components/content";
import { institutionPathways } from "@/app/data/navigation";
import { disclosureSample, siteFacts } from "@/app/data/site";

export const metadata: Metadata = {
  title: "Phase 1 Design System",
  description:
    "Review the SSKEMS navigation contract, design tokens and reusable accessible component system.",
};

const componentGroups = [
  {
    label: "Layout",
    items: ["PageContainer", "ReadingContainer", "Section", "Stack", "Inline", "Grid", "Cluster", "Divider", "AspectRatio", "VisuallyHidden"],
  },
  {
    label: "Typography",
    items: ["Heading", "Text", "Lead", "Eyebrow", "Caption", "TextLink", "ExternalLink", "DownloadLink", "List", "Quote"],
  },
  {
    label: "Controls",
    items: ["Button", "IconButton", "Input", "Textarea", "Select", "Checkbox", "RadioGroup", "FormField", "FieldHint", "FieldError", "ErrorSummary", "SearchInput"],
  },
  {
    label: "Content",
    items: ["NoticeBar", "Alert", "Breadcrumbs", "ProgrammeCard", "DisclosureDocumentCard", "DocumentList", "ContactCard", "LeadershipCard", "FacultyCard", "Statistic", "Accordion", "DataTable", "ResponsiveImage", "VideoEmbed", "GalleryCard", "EmptyState", "ErrorState", "Pagination"],
  },
];

const brandSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const neutralSteps = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

function StatusMark({ status }: { status: "active" | "pending" }) {
  return <span className={`status-badge status-badge--${status}`}>{status === "active" ? "Confirmed active" : "Management confirmation required"}</span>;
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="phase-hero" aria-labelledby="phase-title">
          <PageContainer className="phase-hero__grid">
            <Stack gap="32">
              <div>
                <Eyebrow>SSKEMS digital foundation · Phase 1</Eyebrow>
                <Heading as="h1" level="display" id="phase-title">
                  One trustworthy system before the storytelling begins.
                </Heading>
              </div>
              <Lead>
                This review build establishes the verified navigation, shared design language and accessible components that every future SSKEMS page will use.
              </Lead>
              <Cluster gap="12">
                <a className="button button--primary" href="#navigation-contract">Review navigation</a>
                <a className="button button--secondary" href="#component-catalogue">Explore components</a>
              </Cluster>
              <Caption>Review environment · Not the final public homepage</Caption>
            </Stack>
            <aside className="phase-summary" aria-label="Phase status">
              <div className="phase-summary__topline"><span>Foundation review</span><strong>01</strong></div>
              <Heading as="h2" level="section">Implementation ready for structured review</Heading>
              <ul className="phase-summary__list">
                <li><span aria-hidden="true">✓</span> Three-level token architecture</li>
                <li><span aria-hidden="true">✓</span> Shared responsive components</li>
                <li><span aria-hidden="true">✓</span> Keyboard patterns implemented</li>
                <li><span aria-hidden="true">○</span> Pathway sign-off pending</li>
              </ul>
              <div className="phase-summary__meter" role="progressbar" aria-label="Foundation decisions ready" aria-valuemin={0} aria-valuemax={4} aria-valuenow={3}><span /></div>
            </aside>
          </PageContainer>
        </section>

        <Section tone="subtle" id="navigation-contract" aria-labelledby="navigation-title">
          <PageContainer>
            <div className="section-heading">
              <Eyebrow>01 · Navigation contract</Eyebrow>
              <Heading as="h2" level="page" id="navigation-title">Lead with what is verified.</Heading>
              <Lead>Only the CBSE School is currently treated as a confirmed institutional pathway. Junior College and Institute remain out of primary navigation until management approves their current status and content.</Lead>
            </div>
            <Grid min="card" gap="24" className="pathway-grid">
              {institutionPathways.map((pathway, index) => (
                <article className={`pathway-card pathway-card--${pathway.status}`} data-index={`0${index + 1}`} key={pathway.href}>
                  <StatusMark status={pathway.status} />
                  <Heading as="h3" level="section">{pathway.label}</Heading>
                  <Text>{pathway.evidence}</Text>
                  {pathway.status === "active" ? <TextLink href={pathway.href}>Open pathway</TextLink> : <Caption>Hidden from primary navigation</Caption>}
                </article>
              ))}
            </Grid>
            <Alert title="Approval needed" kind="warning">
              Management and parent representatives should confirm the labels, hierarchy and status of Junior College and Institute before Phase 1 is signed off.
            </Alert>
          </PageContainer>
        </Section>

        <Section id="tokens" aria-labelledby="tokens-title">
          <PageContainer>
            <div className="section-heading section-heading--split">
              <div>
                <Eyebrow>02 · Design tokens</Eyebrow>
                <Heading as="h2" level="page" id="tokens-title">A system, not a collection of guesses.</Heading>
              </div>
              <Text>The palette is provisional, sampled from the current crest, and must pass a final photography and contrast review before brand approval.</Text>
            </div>
            <div className="token-board">
              <div className="token-board__group">
                <Heading as="h3" level="subsection">Reference · Brand</Heading>
                <div className="swatch-row" aria-label="Brand reference colour scale">
                  {brandSteps.map((step) => <div className="swatch" key={step}><span style={{ background: `var(--color-brand-${step})` }} /><small>{step}</small></div>)}
                </div>
              </div>
              <div className="token-board__group">
                <Heading as="h3" level="subsection">Reference · Neutral</Heading>
                <div className="swatch-row" aria-label="Neutral reference colour scale">
                  {neutralSteps.map((step) => <div className="swatch" key={step}><span style={{ background: `var(--color-neutral-${step})` }} /><small>{step}</small></div>)}
                </div>
              </div>
              <Divider />
              <Grid min="compact" gap="16">
                <div className="token-level"><span>01</span><strong>Reference</strong><small>Raw values</small></div>
                <div className="token-level"><span>02</span><strong>Semantic</strong><small>Purpose-led aliases</small></div>
                <div className="token-level"><span>03</span><strong>Component</strong><small>Necessary exceptions</small></div>
              </Grid>
            </div>
          </PageContainer>
        </Section>

        <Section tone="brand" id="primitives" aria-labelledby="primitives-title">
          <PageContainer>
            <div className="section-heading section-heading--light">
              <Eyebrow>03 · Layout and type</Eyebrow>
              <Heading as="h2" level="page" id="primitives-title">Structure that survives real content.</Heading>
              <Lead>Containers, spacing and typography remain legible from 320px screens through wide desktops, large text and multilingual content.</Lead>
            </div>
            <Grid min="card" gap="24">
              <article className="primitive-panel">
                <Eyebrow>Reading container</Eyebrow>
                <Heading as="h3" level="section">Clear hierarchy</Heading>
                <Text>Every page receives one clear first-level heading and a predictable content rhythm.</Text>
                <Text lang="mr">शिक्षण, संस्कार आणि आत्मविश्वास यांचा समतोल विकास.</Text>
                <Text lang="hi">शिक्षा, संस्कार और आत्मविश्वास का संतुलित विकास।</Text>
              </article>
              <article className="primitive-panel primitive-panel--ratio">
                <Eyebrow>Aspect ratio</Eyebrow>
                <AspectRatio ratio="landscape" className="ratio-demo"><span>16:10 responsive media frame</span></AspectRatio>
              </article>
            </Grid>
            <ReadingContainer className="type-specimen">
              <Eyebrow>Typography specimen</Eyebrow>
              <Heading as="h3" level="page">A composed voice for important information.</Heading>
              <Lead>Lead text makes the key idea easy to find. Body text remains calm, readable and direct.</Lead>
              <Text>Text links are <TextLink href="#controls">visually identifiable</TextLink>, while <ExternalLink href="https://www.cbse.gov.in/">external destinations</ExternalLink> communicate their behaviour.</Text>
              <Quote cite="Component content principle">Say what is known. Label what is pending. Never decorate uncertainty into fact.</Quote>
            </ReadingContainer>
          </PageContainer>
        </Section>

        <Section tone="subtle" id="controls" aria-labelledby="controls-title">
          <PageContainer>
            <div className="section-heading">
              <Eyebrow>04 · Controls and forms</Eyebrow>
              <Heading as="h2" level="page" id="controls-title">Every state is part of the component.</Heading>
              <Lead>Targets, focus rings, validation messages and disabled states are designed into the foundation—not left to individual pages.</Lead>
            </div>
            <div className="control-lab">
              <div className="control-lab__buttons">
                <Heading as="h3" level="subsection">Actions</Heading>
                <Cluster gap="12">
                  <Button type="button">Primary action</Button>
                  <Button type="button" variant="secondary">Secondary action</Button>
                  <Button type="button" variant="quiet">Quiet action</Button>
                  <Button type="button" disabled>Disabled</Button>
                  <Button type="button" loading>Loading</Button>
                  <IconButton type="button" label="Example icon control"><span aria-hidden="true">+</span></IconButton>
                </Cluster>
              </div>
              <form className="control-lab__form" aria-label="Component state examples">
                <ErrorSummary errors={[{ href: "#example-email", message: "Enter a valid email address" }]} />
                <Grid min="card" gap="24">
                  <Stack gap="16">
                    <FormField id="example-name" label="Parent or guardian’s full name" hint="Use the name we should use when contacting you.">
                      <Input autoComplete="name" defaultValue="Anita Patil" />
                    </FormField>
                    <FormField id="example-email" label="Email address" error="Enter a valid email address">
                      <Input type="email" defaultValue="anita@" />
                    </FormField>
                    <FormField id="example-reference" label="Internal reference" hint="This value is read-only.">
                      <Input readOnly value="SSKEMS-2026-001" />
                    </FormField>
                  </Stack>
                  <Stack gap="16">
                    <FormField id="example-year" label="Academic year">
                      <Select defaultValue="2026"><option value="2026">2026–27</option><option value="2027">2027–28</option></Select>
                    </FormField>
                    <FormField id="example-note" label="Additional details for the admissions team, including any accessibility or communication support required" optional>
                      <Textarea rows={4} placeholder="No additional details provided" />
                    </FormField>
                    <SearchInput aria-label="Search component example" placeholder="Search school information" />
                    <Checkbox label="I agree to be contacted about this enquiry" defaultChecked />
                    <RadioGroup legend="Preferred contact method" name="contact-method" defaultValue="phone" options={[{ label: "Phone", value: "phone" }, { label: "Email", value: "email" }]} />
                  </Stack>
                </Grid>
              </form>
            </div>
          </PageContainer>
        </Section>

        <Section id="content-components" aria-labelledby="content-title">
          <PageContainer>
            <div className="section-heading">
              <Eyebrow>05 · Shared content</Eyebrow>
              <Heading as="h2" level="page" id="content-title">Built first for admissions and trust.</Heading>
              <Lead>Structured components make key facts easier to maintain, verify and understand.</Lead>
            </div>
            <Grid min="card" gap="24">
              <ProgrammeCard eyebrow="Confirmed pathway" title="CBSE School" description="A landing-card pattern for a verified institutional offering." href="/school" />
              <ContactCard title="School office" phone={siteFacts.phone} email={siteFacts.email} hours={siteFacts.workingHours.weekdays} />
              <LeadershipCard name="Name awaiting verification" role="Leadership profile example" message="This component keeps an unverified profile visibly provisional." />
            </Grid>
            <div className="content-showcase-grid">
              <Stack gap="24">
                <DocumentList label="Disclosure component example">
                  <DisclosureDocumentCard {...disclosureSample} />
                </DocumentList>
                <DownloadLink format="PDF" size="Size pending" year="2026–27">Example disclosure document</DownloadLink>
                <Accordion items={[
                  { title: "How will document status be shown?", content: <Text>Every disclosure identifies whether it is current, archived or awaiting verification.</Text> },
                  { title: "What happens when a value is missing?", content: <Text>The interface names the missing value instead of presenting a blank or invented fact.</Text> },
                ]} />
              </Stack>
              <Stack gap="24">
                <div className="statistic-row"><Statistic value={siteFacts.affiliationNumber} label="CBSE affiliation number" /><Statistic value="1" label="Confirmed pathway" /></div>
                <FacultyCard name="Faculty name pending" department="Department pending" qualification="Qualification awaiting verification" />
                <GalleryCard title="Campus image pending" meta="Missing-image state" />
              </Stack>
            </div>
            <Grid min="card" gap="24">
              <Alert title="Information example" kind="information">Use for neutral, time-sensitive guidance.</Alert>
              <Alert title="Success example" kind="success">Use only after an action is confirmed.</Alert>
              <Alert title="Warning example" kind="warning">Use when facts or actions need attention.</Alert>
              <Alert title="Error example" kind="danger">Use for a blocking error with recovery guidance.</Alert>
            </Grid>
            <Grid min="card" gap="24">
              <EmptyState title="No verified notices" description="When approved notices are added, they will appear here." />
              <ErrorState title="Document unavailable" description="Try again later or contact the school office for an accessible copy." />
            </Grid>
            <DataTable caption="Disclosure metadata example" headers={["Document", "Year", "Status"]} rows={[["Affiliation status", "2026–27", "Verification required"], ["Fee structure", "2026–27", "Verification required"]]} />
            <div className="media-component-grid">
              <figure className="media-specimen">
                <ResponsiveImage src="/sskem-logo.png" alt="Current SSKEMS crest and wordmark" width={1498} height={586} sizes="(max-width: 760px) 100vw, 50vw" />
                <figcaption>Responsive image component using the existing school identity.</figcaption>
              </figure>
              <VideoEmbed title="Video component empty-state example" />
            </div>
            <Pagination current={1} total={4} baseHref="/about/news" />
          </PageContainer>
        </Section>

        <Section tone="brand" id="component-catalogue" aria-labelledby="catalogue-title">
          <PageContainer>
            <div className="section-heading section-heading--light">
              <Eyebrow>06 · Component catalogue</Eyebrow>
              <Heading as="h2" level="page" id="catalogue-title">Fifty implemented building blocks. One source of truth.</Heading>
              <Lead>Every listed component is connected to the shared token layer. Interaction, assistive-technology and high-zoom verification remains part of the approval gate.</Lead>
            </div>
            <div className="component-index">
              {componentGroups.map((group) => (
                <section key={group.label} aria-labelledby={`group-${group.label.toLowerCase()}`}>
                  <Heading as="h3" level="subsection" id={`group-${group.label.toLowerCase()}`}>{group.label}</Heading>
                  <List>{group.items.map((item) => <li key={item}><span>{item}</span><small>Implemented</small></li>)}</List>
                </section>
              ))}
            </div>
            <VisuallyHidden>End of the Phase 1 component catalogue.</VisuallyHidden>
          </PageContainer>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
