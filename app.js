'use strict';

const flow = document.querySelector('#flow');
const back = document.querySelector('#back');
const reset = document.querySelector('#reset');
const progress = [...document.querySelectorAll('.progress li')];
let state = { screen: 'symptom' };
let history = [];
let checkStarted = false;
let recommendationViewed = false;

function trackUsage(name) {
  if (location.hostname === 'yxhtl.github.io' && typeof window.gtag === 'function') {
    window.gtag('event', name);
  }
}

const questions = {
  symptom: {
    title: '你遇到的是哪种情况？',
    help: '选最接近的一项。后面的检查会随你的回答变化。',
    choices: [
      ['silent', '按语音快捷键没反应', '没有出现语音界面，也没有错误提示'],
      ['failed', '提示“语音启动失败”', '已经触发，但软件明确报错'],
      ['delivery', '识别出文字，却没进输入框', '能看到识别结果，目标应用里没有文字']
    ]
  },
  microphone: {
    title: '同一个麦克风，其他软件能录到声音吗？',
    help: '用 Windows 录音应用等录一小段并回放，确认测试的是同一个麦克风。只看到设备名称，不算录音成功。',
    choices: [
      ['yes', '能，回放能听见声音', '只证明这个应用可以收音，豆包权限仍需单独核对'],
      ['no', '不能，没有声音或无法录音', '先看设备、静音和系统访问权限'],
      ['unknown', '还没测，不确定', '先做对照检查，再回来继续']
    ]
  },
  scope: {
    title: '换到普通文本框，豆包语音能正常输入吗？',
    help: '比如打开记事本，点击空白输入区域，切到豆包输入法，用软件设置中的语音快捷键试一句。只测试豆包，Windows 自带语音不能代替这一步。',
    choices: [
      ['single', '能，只有原来的应用不行', '在记事本能输入，微信等目标应用不行'],
      ['all', '不能，换应用也一样', '多个普通文本框都出现同样的现象'],
      ['unknown', '还没有做对照', '先确认是单个应用，还是多个应用']
    ]
  }
};
const source = {
  microphone: ['微软麦克风排查说明', 'https://support.microsoft.com/zh-cn/windows/hardware/drivers/fix-microphone-problems'],
  permission: ['微软麦克风权限说明', 'https://support.microsoft.com/zh-cn/windows/privacy/turn-on-app-permissions-for-your-microphone-in-windows'],
  launch: ['2026 年 9 月 8 日用户讨论', 'https://linux.do/t/topic/2875316'],
  target: ['2026 年 7 月 17 日用户讨论', 'https://linux.do/t/topic/2600111']
};
function card(title, body, kind = '排查建议 · 待实际验证', ref) {
  const css = kind.startsWith('微软') ? 'official' : kind.startsWith('用户') ? 'community' : '';
  const link = ref ? `<a href="${source[ref][1]}" target="_blank" rel="noopener noreferrer">${source[ref][0]} ↗</a>` : '';
  return `<li class="step-card"><span class="evidence ${css}">${kind}</span><h3>${title}</h3><p>${body}</p>${link}</li>`;
}
function permissionCard() {
  return card('核对桌面应用的麦克风访问权限', '在“设置 → 隐私和安全性 → 麦克风”中核对设备访问权限与桌面应用访问开关。录音软件能用，不等于桌面应用也有权限；桌面应用通常不在可逐个开关的商店应用列表里。', '微软文档 · 系统步骤', 'permission');
}
function feedbackCard() {
  return card('仍然失败，就带着对照结果反馈', '记录 Windows 版本、豆包输入法版本、完整错误提示、麦克风型号，以及哪些应用能用、哪些不能用。如果软件提供反馈入口，用这些信息提交。截图前遮住聊天内容。单凭本页回答无法判断是否是软件缺陷。');
}
function result() {
  if (!recommendationViewed) {
    trackUsage('recommendation_view');
    recommendationViewed = true;
  }
  let title, help, cards, retry;
  if (state.mic === 'unknown' || state.mic === 'no') {
    title = state.mic === 'no' ? '先排查收音，再回到豆包测试' : '先做一次麦克风对照检查';
    help = state.mic === 'no' ? '其他软件也没录到声音。目前还不能把故障归因于豆包。' : '现在缺少收音结果，先补这个检查会更有用。';
    cards = [card('检查连接、静音和输入设备', '确认耳机或麦克风已连接，物理静音关闭。在“设置 → 系统 → 声音 → 输入”中选择实际使用的设备，进入其属性做麦克风测试。', '微软文档 · 系统步骤', 'microphone'), permissionCard(), card('在录音应用里回放，再试豆包', '给用于测试的录音应用相应权限，录一句话并回放。能听见后，再用豆包试同一句。如果仍然不行，返回工具继续区分是单个应用还是多个应用。')];
    retry = 'microphone';
  } else if (state.scope === 'unknown') {
    title = '先比较两个输入框';
    help = '还不能判断是否只影响某个应用。先补一组对照结果。';
    cards = [card('用记事本做对照', '点击记事本的编辑区域，确认当前输入法是豆包，再用软件设置中的语音快捷键试一句。观察语音界面、报错和文字是否进入输入框。'), card('回到原来的应用重复一次', '用同一个麦克风和同一句话测试，记录差别。普通文本框可用、原应用不可用时，才继续走单个应用的检查路径。')];
    retry = 'scope';
  } else if (state.scope === 'single') {
    title = '重点检查原来的目标应用';
    help = '你报告豆包在记事本能用。这缩小了范围，但还不能确定是兼容性、焦点还是软件状态的问题。';
    cards = [card('确认焦点确实在可编辑的输入框', '回到原应用，点击普通文字输入框，先手动打一个字，再试豆包语音。密码框、只读区域和特殊编辑控件不适合作为普通文本框的对照。'), card('保存内容后，退出并重开目标应用', '如果是微信，可先保存未发送的内容，再退出重开并测试。历史讨论中有人报告该办法或更新微信后改善；未完整列出版本，本页未验证当前版本效果。其他应用暂无同样证据。', '用户报告 · 历史办法，未复现', 'target'), feedbackCard()];
  } else if (state.symptom === 'silent') {
    title = '先核对语音触发这一环';
    help = '多个输入框都没有反应，且另一个应用能收音。还不能排除豆包的访问权限或软件状态问题。';
    cards = [card('核对当前输入法与语音快捷键', '在普通文本框里确认切到了豆包输入法；打开豆包自己的设置，核对当前语音快捷键，再按设置里显示的组合测试。不要把 Windows 自带的语音快捷键当作豆包快捷键。'), permissionCard(), feedbackCard()];
  } else if (state.symptom === 'failed') {
    title = '保留报错，先核对桌面应用权限';
    help = '“语音启动失败”描述了结果，没有说明原因。另一款软件能录音也不能排除豆包的权限或内部故障。';
    cards = [permissionCard(), card('记录版本与完整报错', '2026 年 9 月 8 日有用户报告 Windows 0.9.0 出现语音启动失败，但讨论没有证明统一原因。不要据此认定当前版本有相同缺陷；记录你自己的版本和复现条件。', '用户报告 · 0.9.0，未验证最新版', 'launch'), feedbackCard()];
  } else {
    title = '重点检查文字送入输入框这一环';
    help = '你能看到识别结果，却在多个普通文本框里都无法输入。这个现象不能直接归结为麦克风没声音。';
    cards = [card('确认输入框可以接收普通文字', '在记事本里先手动打一小段文字，再点回编辑区域试豆包语音。如果普通键盘输入也不行，先处理输入框或输入法的基础输入问题。'), card('区分识别结果与最终输入', '记录识别文字出现在哪里、是否有确认动作，以及确认后发生了什么。按你当前版本的实际界面操作，不假定所有版本都有相同按钮。'), feedbackCard()];
  }
  const labels = [questions.symptom.choices.find(c => c[0] === state.symptom)[1]];
  if (state.mic) labels.push({yes:'其他软件能录音',no:'其他软件不能录音',unknown:'麦克风未测试'}[state.mic]);
  if (state.scope) labels.push({single:'仅原应用异常',all:'多个应用异常',unknown:'未比较输入框'}[state.scope]);
  flow.innerHTML = `<span class="result-tag">按你的回答，建议先做这些检查</span><h2 tabindex="-1">${title}</h2><p class="help">${help}</p><div class="answer-summary" aria-label="你的选择">${labels.map(l=>`<span>${l}</span>`).join('')}</div><ol class="steps">${cards.join('')}</ol><p class="boundary">一次只改一个条件，再用同一句话复测。以上是检查顺序，未证明原因或修复效果。</p>${retry ? `<button class="primary" data-retry="${retry}">检查后，重新回答这一步 →</button>` : ''}`;
}
function render(focus = true) {
  const current = state.screen === 'symptom' ? 0 : state.screen === 'result' ? 2 : 1;
  progress.forEach((item, i) => {
    item.classList.toggle('done', i < current);
    if (i === current) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  back.hidden = !history.length;
  reset.hidden = state.screen === 'symptom';
  if (state.screen === 'result') result();
  else {
    const q = questions[state.screen];
    flow.innerHTML = `<h2 tabindex="-1">${q.title}</h2><p class="help">${q.help}</p><div class="choices">${q.choices.map((c,i)=>`<button class="choice" data-answer="${c[0]}"><span class="choice-code" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="choice-copy"><strong>${c[1]}</strong><small>${c[2]}</small></span><span class="choice-arrow" aria-hidden="true">→</span></button>`).join('')}</div>`;
  }
  if (focus) flow.querySelector('h2').focus();
}
function advance(next) {
  history.push({...state});
  state = next;
  render();
}
flow.addEventListener('click', event => {
  const choice = event.target.closest('[data-answer]');
  const retry = event.target.closest('[data-retry]');
  if (retry) {
    const next = {...state, screen: retry.dataset.retry};
    if (next.screen === 'microphone') delete next.mic;
    delete next.scope;
    advance(next);
  }
  if (!choice) return;
  const answer = choice.dataset.answer;
  if (state.screen === 'symptom') {
    if (!checkStarted) {
      trackUsage('check_start');
      checkStarted = true;
    }
    advance({symptom:answer, screen:answer === 'delivery' ? 'scope' : 'microphone'});
  }
  else if (state.screen === 'microphone') advance({symptom:state.symptom, mic:answer, screen:answer === 'yes' ? 'scope' : 'result'});
  else if (state.screen === 'scope') advance({...state, scope:answer, screen:'result'});
});
back.addEventListener('click', () => { if (history.length) {state = history.pop(); render();} });
reset.addEventListener('click', () => {state = {screen:'symptom'}; history = []; render();});
render(false);
