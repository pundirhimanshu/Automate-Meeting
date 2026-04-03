-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "executedWorkflows" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "inviteeLimit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "roundRobinIndex" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hiddenContactCols" TEXT;

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "timeValue" INTEGER,
    "timeUnit" TEXT,
    "action" TEXT NOT NULL DEFAULT 'SEND_EMAIL',
    "sendTo" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL DEFAULT 'system',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingForm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "headlessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutingForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingQuestion" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "label" TEXT NOT NULL,
    "identifier" TEXT,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RoutingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingRule" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "questionId" TEXT,
    "operator" TEXT,
    "value" TEXT,
    "destination" TEXT NOT NULL,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RoutingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "inviteeName" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "destination" TEXT,
    "source" TEXT NOT NULL DEFAULT 'internal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EventTypeToWorkflow" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RoutingForm_slug_key" ON "RoutingForm"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingForm_headlessToken_key" ON "RoutingForm"("headlessToken");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingForm_userId_slug_key" ON "RoutingForm"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "_EventTypeToWorkflow_AB_unique" ON "_EventTypeToWorkflow"("A", "B");

-- CreateIndex
CREATE INDEX "_EventTypeToWorkflow_B_index" ON "_EventTypeToWorkflow"("B");

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingForm" ADD CONSTRAINT "RoutingForm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingQuestion" ADD CONSTRAINT "RoutingQuestion_formId_fkey" FOREIGN KEY ("formId") REFERENCES "RoutingForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingRule" ADD CONSTRAINT "RoutingRule_formId_fkey" FOREIGN KEY ("formId") REFERENCES "RoutingForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingRule" ADD CONSTRAINT "RoutingRule_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "RoutingQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingSubmission" ADD CONSTRAINT "RoutingSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "RoutingForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventTypeToWorkflow" ADD CONSTRAINT "_EventTypeToWorkflow_A_fkey" FOREIGN KEY ("A") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventTypeToWorkflow" ADD CONSTRAINT "_EventTypeToWorkflow_B_fkey" FOREIGN KEY ("B") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
