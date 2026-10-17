// The 60-second tour: one drawing note per stop. Targets are element ids in index.html;
// `timeline` selects a span first, `project` spotlights that card instead of the grid.
export const tourSteps = [
  {
    target: 'drive',
    title: 'My own gearbox, live',
    text: 'This 144 : 1 cycloidal drive is generated from the same equations as its CAD model. Drag it, scroll to turn the input shaft, or switch to the exploded view.',
  },
  {
    target: 'about-stats',
    title: 'The figures first',
    text: 'Years of hands-on work, the projects on this sheet, the hardware builds among them, and the 80% cut in manual calibration at ITronic.',
  },
  {
    target: 'timeline',
    title: 'Where I have worked',
    text: 'Embedded firmware at ITronic in Stuttgart, hardware engineering at Protocod, and the M.Eng. at Deggendorf. Select a span to read what I did there.',
    timeline: 'itronic',
  },
  {
    target: 'project-grid',
    title: 'Projects as detail views',
    text: 'Robots, perception models, mechanisms and apps. Hover a card to preview its video, or open one for images, numbers and links.',
    project: 'tb3-follower',
  },
  {
    target: 'bom',
    title: 'Skills as a bill of materials',
    text: 'Each part lists the projects and roles where I used it. Select a part to filter the projects; a lettered balloon opens that project.',
  },
  {
    target: 'contact',
    title: 'Get in touch',
    text: 'Email is quickest. Choose a role at the top of the page and the draft email is addressed for it, or save my contact card.',
  },
];
