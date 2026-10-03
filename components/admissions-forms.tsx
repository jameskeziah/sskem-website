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

    setMessage(
      "Review complete. Nothing was submitted, stored or sent from this preview.",
    );
  }

  return (
    <form
      id="enquiry-form"
      className="admissions-form admissions-enquiry-form"
      onSubmit={review}
      aria-describedby="enquiry-review-boundary"
    >
      <div className="admissions-form__heading admissions-enquiry-form__heading">
        <p className="eyebrow">Short enquiry</p>

        <h2>What can admissions help you with?</h2>

        <div
          className="admissions-enquiry-form__notice"
          id="enquiry-review-boundary"
        >
          <strong>Preview only</strong>

          <p>
            Real submission is not active yet. Use example information
            while reviewing this page. Nothing entered here is sent or stored.
          </p>
        </div>
      </div>

      <div className="admissions-form__grid admissions-enquiry-form__grid">
        <FormField
          id="enquiry-parent-name"
          label="Parent or guardian name"
        >
          <Input
            name="parentName"
            autoComplete="name"
            required
          />
        </FormField>

        <FormField
          id="enquiry-mobile"
          label="Mobile number"
          hint="Use an example number while this page is in preview."
        >
          <Input
            name="mobile"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required
          />
        </FormField>

        <FormField
          id="enquiry-class"
          label="Class you are considering"
        >
          <Select
            name="classSought"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Select a class
            </option>

            {admissionClassOptions.map((option) => (
              <option
                value={option.value}
                key={option.value}
              >
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          id="enquiry-year"
          label="Academic year"
        >
          <Select
            name="academicYear"
            defaultValue={admissionsCycle.academicYear}
            required
          >
            <option>
              {admissionsCycle.academicYear}
            </option>
          </Select>
        </FormField>

        <FormField
          id="enquiry-topic"
          label="What do you need help with?"
        >
          <Select
            name="enquiryTopic"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Choose a topic
            </option>

            <option value="availability">
              Class availability
            </option>

            <option value="fees">
              Fees
            </option>

            <option value="curriculum">
              Curriculum or academics
            </option>

            <option value="transport">
              Transport
            </option>

            <option value="visit">
              School visit
            </option>

            <option value="accessibility">
              Accessibility or support
            </option>

            <option value="process">
              Admission process
            </option>

            <option value="other">
              Something else
            </option>
          </Select>
        </FormField>

        <RadioGroup
          legend="Preferred contact method"
          name="preferredContactMethod"
          defaultValue="phone"
          required
          options={[
            { label: "Phone", value: "phone" },
            { label: "Email", value: "email" },
          ]}
        />

        <FormField
          id="enquiry-email"
          label="Email address"
          hint="Add this if you would prefer an email response."
          optional
        >
          <Input
            name="email"
            type="email"
            autoComplete="email"
          />
        </FormField>

        <FormField
          id="enquiry-question"
          label="Your question"
          hint="A short message is enough."
          optional
        >
          <Textarea
            name="question"
            rows={5}
          />
        </FormField>
      </div>

      <div className="admissions-enquiry-form__privacy">
        <strong>No documents are needed here.</strong>

        <p>
          Do not upload or send Aadhaar, certificates, marksheets,
          bank details or detailed medical information with an enquiry.
        </p>
      </div>

      <Checkbox
        id="enquiry-consent"
        name="contactConsent"
        label="I consent to be contacted about this admissions enquiry"
        required
      />

      <div className="admissions-form__actions admissions-enquiry-form__actions">
        <Button type="submit">
          Review enquiry
        </Button>

        <span>
          Actual submission will activate only after privacy,
          routing and notification controls are approved.
        </span>
      </div>

      <p
        id={statusId}
        className="admissions-form__status"
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    </form>
  );
}

export function ApplicationJourneyPrototype() {
  const [activeStep, setActiveStep] = useState(0);
  const step = applicationSteps[activeStep];

  return (
    <div className="application-prototype application-prototype--v2">
      <header className="application-prototype__progress">
        <div>
          <span>Application blueprint</span>

          <strong>
            Step {activeStep + 1} of {applicationSteps.length}
          </strong>
        </div>

        <small>
          Preview only. Nothing entered here is saved or submitted.
        </small>

        <div
          role="progressbar"
          aria-label="Application prototype progress"
          aria-valuemin={1}
          aria-valuemax={applicationSteps.length}
          aria-valuenow={activeStep + 1}
        >
          <span
            style={{
              "--application-progress":
                (activeStep + 1) / applicationSteps.length,
            } as CSSProperties}
          />
        </div>
      </header>

      <div className="application-prototype__workspace">
        <nav
          aria-label="Application steps"
          className="application-prototype__steps"
        >
          {applicationSteps.map((item, index) => (
            <button
              type="button"
              aria-current={index === activeStep ? "step" : undefined}
              onClick={() => setActiveStep(index)}
              key={item.title}
            >
              <span>
                {String(index + 1).padStart(2, "0")}
              </span>

              <strong>
                {item.title}
              </strong>

              <small>
                {index === activeStep ? "Current step" : "Preview"}
              </small>
            </button>
          ))}
        </nav>

        <section
          className="application-prototype__panel"
          aria-live="polite"
        >
          <div className="application-prototype__panel-number">
            {String(activeStep + 1).padStart(2, "0")}
          </div>

          <div className="application-prototype__panel-copy">
            <p className="eyebrow">
              Application step {activeStep + 1}
            </p>

            <h2>
              {step.title}
            </h2>

            <p>
              {step.fields}.
            </p>

            {activeStep === 0 ? (
              <p className="application-prototype__guardrail">
                The class and route should already have been reviewed
                before this stage becomes a real form.
              </p>
            ) : null}

            {activeStep === 4 ? (
              <p className="application-prototype__guardrail">
                Detailed medical records belong in a separately
                restricted post-offer process.
              </p>
            ) : null}

            {activeStep === 5 ? (
              <p className="application-prototype__guardrail">
                Secure private upload, MIME validation, malware scanning
                and an access audit are required before files can be
                accepted.
              </p>
            ) : null}

            {activeStep === 6 ? (
              <p className="application-prototype__guardrail">
                Submission does not guarantee admission. A complete
                review screen and approved declaration must precede
                final submission.
              </p>
            ) : null}

            <div className="application-prototype__controls">
              <Button
                type="button"
                variant="secondary"
                disabled={activeStep === 0}
                onClick={() =>
                  setActiveStep((value) => Math.max(0, value - 1))
                }
              >
                Previous step
              </Button>

              <Button
                type="button"
                disabled={activeStep === applicationSteps.length - 1}
                onClick={() =>
                  setActiveStep((value) =>
                    Math.min(applicationSteps.length - 1, value + 1)
                  )
                }
              >
                Next step
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function StatusLookupPrototype() {
  return (
    <form
      className="status-prototype status-prototype--v2"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="status-prototype__heading">
        <p className="eyebrow">
          Secure lookup preview
        </p>

        <h2>
          Parent application status
        </h2>

        <p>
          Review mode only. Authentication and lookup are not active.
          Do not enter real application credentials.
        </p>
      </div>

      <div className="status-prototype__fields">
        <FormField
          id="status-reference"
          label="Application reference"
        >
          <Input
            name="applicationReference"
            placeholder="Example: APP-000000"
            disabled
          />
        </FormField>

        <FormField
          id="status-mobile"
          label="Registered mobile number"
        >
          <Input
            name="registeredMobile"
            type="tel"
            placeholder="Registered parent mobile"
            disabled
          />
        </FormField>

        <FormField
          id="status-otp"
          label="One-time password"
        >
          <Input
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit OTP"
            disabled
          />
        </FormField>
      </div>

      <div className="status-prototype__action">
        <Button type="button" disabled>
          Check status
        </Button>

        <span>
          Lookup is currently disabled.
        </span>
      </div>

      <div className="status-prototype__security">
        <span>Production requirements</span>

        <p>
          OTP expiry, attempt limits, rate limiting, consented delivery,
          secure sessions and parent-safe status filtering are required
          before this service can activate.
        </p>
      </div>
    </form>
  );
}

export function VisitRequestPrototype() {
  return (
    <form
      className="admissions-form admissions-form--compact admissions-visit-form"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="admissions-form__heading admissions-visit-form__heading">
        <p className="eyebrow">
          Visit request preview
        </p>

        <h2>
          Plan a school visit.
        </h2>

        <div className="admissions-visit-form__notice">
          <strong>
            Online booking is not active.
          </strong>

          <p>
            These fields show the information a future visit request
            may use. Contact the school office for a real appointment.
          </p>
        </div>
      </div>

      <div className="admissions-form__grid admissions-visit-form__grid">
        <FormField
          id="visit-parent"
          label="Parent or guardian name"
        >
          <Input disabled />
        </FormField>

        <FormField
          id="visit-mobile"
          label="Mobile number"
        >
          <Input
            type="tel"
            disabled
          />
        </FormField>

        <FormField
          id="visit-date"
          label="Preferred visit date"
          hint="The school office must confirm the actual appointment."
        >
          <Input
            type="date"
            disabled
          />
        </FormField>

        <FormField
          id="visit-support"
          label="Accessibility or communication support"
          hint="For example mobility, interpretation or communication support."
          optional
        >
          <Textarea
            rows={4}
            disabled
          />
        </FormField>
      </div>

      <div className="admissions-visit-form__status">
        <span>Current route</span>

        <strong>
          Arrange the appointment through the school office.
        </strong>
      </div>

      <Button
        type="button"
        disabled
      >
        Online request unavailable
      </Button>
    </form>
  );
}
