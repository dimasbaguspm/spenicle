import { Tile } from '@dimasbaguspm/versaur/primitive';
import { FormProvider } from 'react-hook-form';

import { PersonalInfoStep, SecurityStep, FormProgress, FormHeader, FormNavigation, FormFooter } from './components';
import { useRegisterForm } from './use-register-form.hook';

export function RegisterForm() {
  const {
    methods,
    handleSubmit,
    watchedPassword,
    currentStep,
    progress,
    isCurrentStepValid,
    getFieldValidationRules,
    nextStep,
    prevStep,
    onSubmit,
    isPending,
    STEPS,
  } = useRegisterForm();

  return (
    <div className="max-w-2xl mx-auto">
      <Tile size="lg">
        <FormHeader />
        <FormProgress currentStep={currentStep} totalSteps={STEPS.length} progress={progress} />

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && <PersonalInfoStep getFieldValidationRules={getFieldValidationRules} />}

            {/* Step 2: Security Setup */}
            {currentStep === 2 && (
              <SecurityStep watchedPassword={watchedPassword} getFieldValidationRules={getFieldValidationRules} />
            )}

            <FormNavigation
              currentStep={currentStep}
              totalSteps={STEPS.length}
              isCurrentStepValid={isCurrentStepValid}
              isPending={isPending}
              onPrevStep={prevStep}
              onNextStep={nextStep}
            />
          </form>
        </FormProvider>

        <FormFooter />
      </Tile>
    </div>
  );
}
