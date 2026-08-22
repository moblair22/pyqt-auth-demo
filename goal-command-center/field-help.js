// Contextual ? help for form fields across Goal Command Center.
(() => {
  const helpById = {
    gTitle: 'Give the goal a clear outcome-focused name. Example: Save $20,000 or Run a 5K.',
    editGoalTitle: 'The name of the main outcome you want to achieve.',
    gCat: 'Choose the life area this goal belongs to so your goals stay organized.',
    editGoalCategory: 'Choose the life area this goal belongs to so your goals stay organized.',
    gStartDate: 'The date you plan to begin working on this goal.',
    editGoalStart: 'The date you plan to begin working on this goal.',
    gEndDate: 'The deadline you want to reach this goal by. It must be on or after the start date.',
    editGoalEnd: 'The deadline you want to reach this goal by. It must be on or after the start date.',
    gWhy: 'Write why this goal matters to you. A strong reason helps you stay committed when motivation drops.',
    editGoalWhy: 'Write why this goal matters to you. A strong reason helps you stay committed when motivation drops.',
    sgTitle: 'A subgoal is a smaller measurable result that moves the main goal forward.',
    editSubgoalTitle: 'A subgoal is a smaller measurable result that moves the main goal forward.',
    sgStartDate: 'The date you plan to begin this subgoal.',
    editSubgoalStart: 'The date you plan to begin this subgoal.',
    sgEndDate: 'The date you want this subgoal completed.',
    editSubgoalEnd: 'The date you want this subgoal completed.',
    mTitle: 'A milestone is a checkpoint that proves meaningful progress toward the goal.',
    tTitle: 'A specific action you can complete today. Keep it small enough to actually finish.',
    tGoal: 'Choose the main goal this action supports. Leave it blank if it is only a quick one-off action.',
    hTitle: 'A habit is a behavior you want to repeat consistently, such as reading or exercising.',
    wentWell: 'Record a win from today. This helps you notice progress and reinforce what is working.',
    attention: 'Record anything that needs correction, follow-up, or more attention.',
    priority: 'Choose the single most important thing you want to move forward tomorrow.',
    authEmail: 'Your email identifies your private Goal Command Center account and is used to sign in on other devices.',
    authPassword: 'Your account password. Use at least 6 characters and keep it private.',
    onboardingCustomGoal: 'Add a goal that is not covered by the suggested life areas.',
    onboardingName: 'Optional name or nickname the app can use when personalizing your experience.',
    rbTitle: 'Enter the title of the book you want to track.',
    rbAuthor: 'Enter the book author so the title is easier to identify later.',
    rbPages: 'Enter the total number of pages so the app can measure your reading progress.'
  };

  const helpByLabel = {
    'Goal': 'The main outcome you want to achieve.',
    'Category': 'The life area this goal belongs to.',
    'Start date': 'The date you plan to begin working on this item.',
    'End date': 'The date you want this item completed.',
    'Why does it matter?': 'Your reason for pursuing the goal. Make it personal and meaningful.',
    'New subgoal': 'A smaller measurable result that moves the main goal forward.',
    'Subgoal': 'A smaller measurable result that moves the main goal forward.',
    'Add milestone': 'A checkpoint that shows important progress has been made.',
    'Action': 'A concrete task you intend to complete today.',
    'Habit': 'A behavior you want to repeat consistently.',
    'What went well?': 'A short record of what worked or what you accomplished today.',
    'What needs attention?': 'Anything that needs improvement, correction, or follow-up.',
    'Tomorrow’s priority': 'The single most important thing you want to focus on tomorrow.',
    'Email': 'The email used to identify and sign into your private account.',
    'Password': 'Your private sign-in password.',
    'Optional custom goal': 'A goal you want to add outside the suggested categories.',
    'Your name or nickname (optional)': 'Optional name the app can use to personalize your experience.',
    'Title': 'The name of the item you are adding.',
    'Author': 'The author of the book.',
    'Total pages': 'The full page count used to calculate reading progress.'
  };

  function cleanLabel(label) {
    return [...label.childNodes]
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function addHelp(label, text) {
    if (!label || !text || label.dataset.helpReady === '1') return;
    label.dataset.helpReady = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'field-help';
    btn.setAttribute('aria-label', `Help: ${text}`);
    btn.setAttribute('data-help', text);
    btn.textContent = '?';
    label.appendChild(btn);
  }

  function annotate(root = document) {
    root.querySelectorAll?.('.field label').forEach(label => {
      if (label.dataset.helpReady === '1') return;
      const field = label.closest('.field');
      const control = field?.querySelector('input,select,textarea');
      const idHelp = control?.id ? helpById[control.id] : '';
      const labelHelp = helpByLabel[cleanLabel(label)] || '';
      addHelp(label, idHelp || labelHelp);
    });

    // Reading list row controls do not have visible labels, so add concise accessible explanations.
    root.querySelectorAll?.('.r-status').forEach(el => {
      el.title = 'Reading status: Want to read, Reading, or Finished.';
      el.setAttribute('aria-label', 'Reading status');
    });
    root.querySelectorAll?.('.r-read').forEach(el => {
      el.title = 'Pages read so far.';
      el.setAttribute('aria-label', 'Pages read');
    });
    root.querySelectorAll?.('.r-total').forEach(el => {
      el.title = 'Total pages in the book.';
      el.setAttribute('aria-label', 'Total pages');
    });
  }

  if (!document.querySelector('#fieldHelpStyle')) {
    const style = document.createElement('style');
    style.id = 'fieldHelpStyle';
    style.textContent = `
      .field label{display:flex;align-items:center;gap:7px;position:relative;width:max-content;max-width:100%}
      .field-help{width:19px;height:19px;min-width:19px;border:1px solid var(--line);border-radius:50%;background:var(--soft);color:var(--accent2);display:inline-grid;place-items:center;padding:0;font-size:12px;font-weight:850;line-height:1;position:relative;z-index:2}
      .field-help:hover,.field-help:focus-visible{border-color:var(--accent2);color:var(--text);outline:none}
      .field-help::after{content:attr(data-help);position:absolute;left:50%;top:calc(100% + 9px);transform:translateX(-50%);width:260px;max-width:min(260px,calc(100vw - 48px));padding:10px 12px;border:1px solid var(--line);border-radius:11px;background:#101d2e;color:var(--text);font-size:12px;font-weight:500;line-height:1.45;text-align:left;box-shadow:var(--shadow);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .12s ease;white-space:normal;z-index:60}
      .field-help:hover::after,.field-help:focus::after,.field-help:focus-visible::after{opacity:1;visibility:visible}
      @media(max-width:650px){.field-help::after{left:0;transform:none;width:230px}}
    `;
    document.head.appendChild(style);
  }

  annotate();
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      m.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) annotate(node);
      });
    }
  });
  observer.observe(document.body, {childList:true, subtree:true});
})();
