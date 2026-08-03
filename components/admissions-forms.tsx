"use client";

import { FormEvent, useId, useState, type CSSProperties } from "react";

import {
  admissionClassOptions,
  admissionsCycle,
  ageRule,
  applicationSteps,
} from "@/app/data/admissions";
import { Button, Checkbox, FormField, Input, RadioGroup, Select, Textarea } from "@/components/controls";
import { evaluateAgeEligibility, type AgeEligibilityResult } from "@/lib/admissions-policy";

const initialAgeResult: AgeEligibilityResult = {
  code: "manual-review",
  title: "Requires manual review",
  message:
    "The official Maharashtra cut-off date and source order must be approved before this checker can calculate an age result.",
};

export function AgeEligibilityChecker() {
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [classValue, setClassValue] = useState("class-1");
  const [result, setResult] = useState<AgeEligibilityResult>(initialAgeResult);

  function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(
      evaluateAgeEligibility({
        dateOfBirth,
        rule: ageRule,
        classOption: admissionClassOptions.find((option) => option.value === classValue),
      }),
    );
  }

  return (
    <div className="eligibility-checker">
      <div className="eligibility-checker__intro">
        <p className="eyebrow">Eligibility tool</p>
        <h2>Check the review pathway</h2>
        <p>This tool will use the configured government record. Until that record is approved, every check safely routes to manual review.</p>
      </div>
      <form onSubmit={check} className="eligibility-form">
        <FormField id="eligibility-dob" label="Child's date of birth">
          <Input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} required />
        </FormField>
        <FormField id="eligibility-year" label="Academic year">
          <Select value={admissionsCycle.academicYear} disabled><option>{admissionsCycle.academicYear}</option></Select>
        </FormField>
        <FormField id="eligibility-class" label="Class sought">
          <Select value={classValue} onChange={(event) => setClassValue(event.target.value)}>
            {admissionClassOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </Select>
        </FormField>
        <Button type="submit">Check eligibility</Button>
      </form>
      <div className={`eligibility-result eligibility-result--${result.code}`} role="status" aria-live="polite">
        <span>Current result</span>
        <strong>{result.title}</strong>
        <p>{result.message}</p>
      </div>
    </div>
  );
}

export function EnquiryFormPrototype() {
  const [message, setMessage] = useState("");
  const statusId = useId();

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Review complete. No enquiry was submitted, stored or sent from this environment.");
  }

  return (
    <form className="admissions-form" onSubmit={review} aria-describedby="enquiry-review-boundary">
      <div className="admissions-form__heading">
        <p className="eyebrow">Short enquiry prototype</p>
        <h2>Tell admissions what you need</h2>
        <p id="enquiry-review-boundary"><strong>Review mode:</strong> submissions are disabled. Use example information only; this form is not collecting real personal data.</p>
      </div>
      <div className="admissions-form__grid">
        <FormField id="enquiry-parent-name" label="Parent or guardian name">
          <Input name="parentName" autoComplete="name" required />
        </FormField>
        <FormField id="enquiry-mobile" label="Mobile number" hint="Use an example number in this review environment.">
          <Input name="mobile" type="tel" autoComplete="tel" inputMode="tel" required />
        </FormField>
        <FormField id="enquiry-child-name" label="Child's name">
          <Input name="childName" autoComplete="off" required />
        </FormField>
        <FormField id="enquiry-class" label="Class sought">
          <Select name="classSought" defaultValue="" required>
            <option value="" disabled>Select a class</option>
            {admissionClassOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </Select>
        </FormField>
        <FormField id="enquiry-year" label="Academic year">
          <Select name="academicYear" defaultValue={admissionsCycle.academicYear} required>
            <option>{admissionsCycle.academicYear}</option>
          </Select>
        </FormField>
        <RadioGroup
          legend="Preferred contact method"
          name="preferredContactMethod"
          defaultValue="phone"
          required
          options={[{ label: "Phone", value: "phone" }, { label: "Email", value: "email" }]}
        />
        <FormField id="enquiry-email" label="Email address" optional>
          <Input name="email" type="email" autoComplete="email" />
        </FormField>
        <FormField id="enquiry-question" label="Question or message" optional>
          <Textarea name="question" rows={4} />
        </FormField>
      </div>
      <Checkbox id="enquiry-consent" name="contactConsent" label="I consent to be contacted about this admissions enquiry" required />
      <div className="admissions-form__actions">
        <Button type="submit">Review enquiry</Button>
        <span>Operational submission activates only after privacy, routing and notification approval.</span>
      </div>
      <p id={statusId} className="admissions-form__status" role="status" aria-live="polite">{message}</p>
    </form>
  );
}

export function ApplicationJourneyPrototype() {
  const [activeStep, setActiveStep] = useState(0);
  const step = applicationSteps[activeStep];

  return (
    <div className="application-prototype">
      <div className="application-prototype__progress">
        <span>Application blueprint</span>
        <strong>Step {activeStep + 1} of {applicationSteps.length}</strong>
        <div role="progressbar" aria-label="Application prototype progress" aria-valuemin={1} aria-valuemax={applicationSteps.length} aria-valuenow={activeStep + 1}>
          <span
            style={{
              "--application-progress": (activeStep + 1) / applicationSteps.length,
            } as CSSProperties}
          />
        </div>
      </div>
      <nav aria-label="Application steps" className="application-prototype__steps">
        {applicationSteps.map((item, index) => (
          <button type="button" aria-current={index === activeStep ? "step" : undefined} onClick={() => setActiveStep(index)} key={item.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>{item.title}
          </button>
        ))}
      </nav>
      <section className="application-prototype__panel" aria-live="polite">
        <p className="eyebrow">Step {activeStep + 1}</p>
        <h2>{step.title}</h2>
        <p>{step.fields}.</p>
        {activeStep === 4 ? <p className="application-prototype__guardrail">Detailed medical records belong in a separately restricted post-offer process.</p> : null}
        {activeStep === 5 ? <p className="application-prototype__guardrail">Secure private upload, MIME validation, malware scanning and access audit are required before files can be accepted.</p> : null}
        {activeStep === 6 ? <p className="application-prototype__guardrail">Submission does not guarantee admission. A complete review screen and approved declaration will precede submission.</p> : null}
        <div className="application-prototype__controls">
          <Button type="button" variant="secondary" disabled={activeStep === 0} onClick={() => setActiveStep((value) => Math.max(0, value - 1))}>Previous step</Button>
          <Button type="button" disabled={activeStep === applicationSteps.length - 1} onClick={() => setActiveStep((value) => Math.min(applicationSteps.length - 1, value + 1))}>Next step</Button>
        </div>
      </section>
    </div>
  );
}

export function StatusLookupPrototype() {
  return (
    <form className="status-prototype" onSubmit={(event) => event.preventDefault()}>
      <div>
        <p className="eyebrow">Secure lookup blueprint</p>
        <h2>Parent application status</h2>
        <p>Review mode only. Authentication and lookup are not active; do not enter real credentials.</p>
      </div>
      <FormField id="status-reference" label="Application reference">
        <Input name="applicationReference" placeholder="Example: APP-••••••" disabled />
      </FormField>
      <FormField id="status-mobile" label="Registered mobile number">
        <Input name="registeredMobile" type="tel" disabled />
      </FormField>
      <FormField id="status-otp" label="One-time password (OTP)">
        <Input name="otp" inputMode="numeric" autoComplete="one-time-code" disabled />
      </FormField>
      <Button type="button" disabled>Check status</Button>
      <p className="status-prototype__note">The production service requires OTP expiry, attempt limits, rate limiting, consented delivery and parent-safe status filtering.</p>
    </form>
  );
}

export function VisitRequestPrototype() {
  return (
    <form className="admissions-form admissions-form--compact" onSubmit={(event) => event.preventDefault()}>
      <div className="admissions-form__heading">
        <p className="eyebrow">Visit request blueprint</p>
        <h2>Plan a school visit</h2>
        <p><strong>Review mode:</strong> visit booking is not active. Contact the school office to arrange a current appointment.</p>
      </div>
      <div className="admissions-form__grid">
        <FormField id="visit-parent" label="Parent or guardian name"><Input disabled /></FormField>
        <FormField id="visit-mobile" label="Mobile number"><Input type="tel" disabled /></FormField>
        <FormField id="visit-date" label="Preferred visit date"><Input type="date" disabled /></FormField>
        <FormField id="visit-support" label="Accessibility or communication support" optional><Textarea rows={3} disabled /></FormField>
      </div>
      <Button type="button" disabled>Request a visit</Button>
    </form>
  );
}
