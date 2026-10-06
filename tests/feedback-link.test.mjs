import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackLink} from '../src/lib/feedback-link.mjs';
test('feedback requires a configured destination; safe contexts are encoded',()=>{
 const context={pageUrl:'https://wollab.github.io/learning-game-atlas/game/?id=itchy-feet',gameName:'A & B'};
 assert.equal(feedbackLink({enabled:false},context),null);
 assert.equal(feedbackLink({enabled:true,provider:'google-forms',url:'javascript:alert(1)'},context),null);
 const g=new URL(feedbackLink({enabled:true,provider:'github'},context));
 assert.equal(g.searchParams.get('game'),'A & B');assert.equal(g.searchParams.get('page'),context.pageUrl);
 const f=new URL(feedbackLink({enabled:true,provider:'google-forms',url:'https://docs.google.com/forms/d/e/test/viewform',pageEntry:'entry.1',gameEntry:'entry.2'},context));
 assert.equal(f.searchParams.get('entry.1'),context.pageUrl);assert.equal(f.searchParams.get('entry.2'),'A & B');
});
