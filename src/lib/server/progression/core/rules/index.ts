/** Toutes les règles actives. L'ordre compte : `demo.first` avant `demo.extra`. */
import type { Rule } from '../types';
import { profileCompleted } from './profileCompleted';
import { extraDemo, firstDemo } from './demoPublished';
import { conversationReciprocated } from './conversationReciprocated';
import { membershipAccepted } from './membershipAccepted';
import { collaborationCompleted } from './collaborationCompleted';
import { endorsementReceived } from './endorsementReceived';
import { milestoneBand, milestoneMember } from './milestoneAttested';
import { workComposed, workCreditConfirmed } from './workComposed';
import { releaseCreditVerified } from './releaseCreditVerified';

export const RULES: readonly Rule[] = [
	profileCompleted,
	firstDemo,
	extraDemo,
	conversationReciprocated,
	membershipAccepted,
	collaborationCompleted,
	endorsementReceived,
	milestoneBand,
	milestoneMember,
	workComposed,
	workCreditConfirmed,
	releaseCreditVerified
] as Rule[];
