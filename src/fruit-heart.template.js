(async function () {
    'use strict';
__HASH__

/* @include src/config.js */
/* @include src/core/quick-replies.js */
/* @include src/runtime/context.js */
/* @include src/core/presets.js */
/* @include src/ui/primitives.js */
    const style = jq('<style>', { id: `${APP_ID}-style`, text: __PANEL_CSS__ }).appendTo(doc.head);
    style.text(style.text() + __NSFW_AUTO_CSS__);
/* @include src/ui/theme.js */
/* @include src/ui/shell.js */
/* @include src/ui/overview.js */
/* @include src/ui/quick-replies.js */
/* @include src/integrations/ecot.js */
/* @include src/ui/entries.js */
__UPDATES__

/* @include src/ui/settings.js */
/* @include src/ui/router.js */
/* @include src/core/actions.js */
/* @include src/ui/events.js */
/* @include src/runtime/panel.js */
/* @include src/runtime/quick-entry.js */
/* @include src/runtime/generation.js */
/* @include src/runtime/lifecycle.js */
/* @include src/runtime/startup.js */
})();
