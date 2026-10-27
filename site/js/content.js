// All site copy and data in one place. Sources: CV (Aug 2026), projects document, GitHub READMEs,
// LinkedIn project media. Items marked for review are listed in CONTENT-REVIEW.md.

// Hero, about-photo and contact copy live in index.html so they read without JavaScript;
// only the email is needed here (for the copy button).
export const profile = {
  email: 'midhunr2015@gmail.com',
  site: 'https://midhunrajeev.de/',
  yearsHandsOn: 5, // "more than five years of hands-on work" (CV, Aug 2026)
  calibrationCut: 80, // manual calibration effort cut at ITronic (CV, Aug 2026)
};

export const notes = [
  'Mechatronics engineer with more than five years of hands-on work building and validating robotic and embedded systems on real hardware.',
  'At ITronic in Stuttgart I wrote firmware in C, C++ and Lua and designed automated calibration systems that cut manual calibration effort by 80%.',
  'At Protocod Embedded Solutions I took embedded products from schematic and PCB layout through firmware to validation on STM32, ESP32, Raspberry Pi and Arduino.',
  "Master's in Mechatronic and Cyber-Physical Systems at Deggendorf Institute of Technology, focused on advanced robotics, autonomous systems and functional safety.",
  'Comfortable across the stack of a robot: mechanism design, electronics, firmware, ROS, perception models and the statistics to evaluate them.',
  'English (C1), German (A2, improving), Malayalam (native).',
];

export const timeline = {
  startYear: 2015,
  endYear: 2027,
  entries: [
    {
      id: 'btech',
      lane: 'education',
      title: 'B.Tech. Mechanical Engineering',
      org: 'APJ Abdul Kalam Technological University, Kerala, India',
      start: [2015, 8],
      end: [2019, 9],
      label: 'Aug 2015 – Sep 2019',
      points: ['Mechanical engineering foundations: mechanics, machine design, manufacturing, thermodynamics.'],
    },
    {
      id: 'protocod',
      lane: 'work',
      title: 'Hardware Engineer',
      org: 'Protocod Embedded Solutions, India',
      start: [2020, 4],
      end: [2022, 10],
      label: 'Apr 2020 – Oct 2022',
      points: [
        'Developed embedded systems on ESP, STM32, Raspberry Pi and Arduino, from schematic and PCB layout through firmware to validation.',
        'Designed communication interfaces over SPI, I2C, UART and CAN, plus Wi-Fi, Bluetooth and LoRa links.',
        'Built automated hardware test frameworks in Python and LabVIEW; used Python, C/C++ and MATLAB for firmware and data analysis.',
        'Implemented power management for battery-operated devices and produced schematics, BOMs and technical documentation.',
      ],
    },
    {
      id: 'meng',
      lane: 'education',
      title: 'M.Eng. Mechatronic and Cyber-Physical Systems',
      org: 'Deggendorf Institute of Technology (THD), Bavaria, Germany',
      start: [2023, 5],
      end: [2026, 9],
      label: 'May 2023 – Sep 2026',
      points: [
        'Advanced robotics, autonomous systems, embedded systems, software development, networking, cyber-physical systems and functional safety.',
      ],
    },
    {
      id: 'itronic',
      lane: 'work',
      title: 'Working Student, Embedded Software Engineer',
      org: 'ITronic GmbH, Stuttgart, Germany',
      start: [2024, 3],
      end: [2025, 10],
      label: 'Mar 2024 – Oct 2025',
      points: [
        'Developed and maintained firmware for embedded devices in C, C++ and Lua, from requirements analysis to deployment.',
        'Designed fully automated calibration systems for embedded devices, cutting manual calibration effort by 80%.',
        'Worked on real-time behaviour: timing constraints, interrupt handling and determinism.',
        'Tested and debugged on real hardware with oscilloscopes, logic analysers and JTAG debuggers; kept firmware specs and code under Git.',
      ],
    },
  ],
};

export const groups = [
  { id: 'robotics', label: 'Robotics & embedded' },
  { id: 'vision', label: 'AI & vision' },
  { id: 'mechanical', label: 'Mechanical & simulation' },
  { id: 'apps', label: 'Apps & web' },
];

const img = (name, alt, caption) => ({ type: 'image', src: `assets/img/${name}.webp`, alt, caption });
const vid = (name, alt, caption, poster = `${name}-poster`) => ({
  type: 'video',
  src: `assets/video/${name}.mp4`,
  poster: poster ? `assets/img/${poster}.webp` : null,
  alt,
  caption,
});

export const projects = [
  {
    id: 'object-tracking-robot',
    group: 'robotics',
    title: 'Autonomous object-tracking robot',
    summary: 'A ROS robot that detects a target, follows it and avoids obstacles indoors.',
    body: [
      'I built the perception, navigation and control chain as modular ROS nodes on a differential-drive platform. A sensor-fusion layer combined depth-camera data with ultrasonic range readings, which mattered because the depth camera degraded badly on reflective and low-texture surfaces.',
      'A YOLO detector handled detection and classification, and its output drove a tracking loop I tuned for stable following without oscillation at the set-point distance. I tested it across target speeds, indoor scenes and lighting, iterating on parameters from measured tracking error.',
    ],
    facts: [],
    tags: ['ROS', 'Python', 'C++', 'YOLO', 'OpenCV', 'Sensor fusion', 'Linux'],
    media: [],
    links: [],
  },
  {
    id: 'tb3-follower',
    group: 'robotics',
    featured: true,
    title: 'TurtleBot3 person follower',
    summary: 'Follows the nearest person using YOLOv8, LiDAR and a behaviour tree on ROS 2.',
    body: [
      'A team project on a TurtleBot3 Waffle Pi. YOLOv8 finds people in RealSense D435i images, and distance comes from fusing a pinhole-camera estimate with the LDS-02 LiDAR range.',
      'A py_trees behaviour tree ticking at 10 Hz switches between search, approach, hold, stop, orient and avoid, while LiDAR obstacle avoidance ignores the person being followed. The same code runs in Gazebo and on the real robot, with a PyQt5 dashboard and pytest unit tests.',
    ],
    facts: ['Keeps 1.0 m from the person, stops below 0.8 m', 'Top speed 0.22 m/s, 1.0 rad/s', 'Gives up a lost person after 2.5 s'],
    tags: ['ROS 2 Humble', 'YOLOv8', 'py_trees', 'Gazebo', 'RealSense D435i', 'LiDAR', 'PyQt5', 'pytest'],
    media: [
      vid('tb3-real', 'Dashboard and camera view while the real TurtleBot3 follows a person', 'Real-robot test with the PyQt5 dashboard'),
      img('tb3-dashboard', 'Dashboard showing a detected person at 0.69 m with live speed commands', 'Operator dashboard'),
      img('tb3-architecture', 'ROS 2 node graph: camera and LiDAR into perception, behaviour tree, wheel motors and dashboard', 'ROS 2 node architecture'),
    ],
    links: [{ label: 'Code on GitHub', href: 'https://github.com/midhunr1996/Human_following_Robot_Group7' }],
  },
  {
    id: 'uv-robot',
    group: 'robotics',
    title: 'UV-C disinfection robot',
    summary: 'A mobile robot for hospital rooms that stops emitting when a person appears.',
    body: [
      'A compact mobile robot for automated room disinfection, combining navigation with app-based supervision and remote command.',
      'I built an interlock-based safety concept around a live ESP32-CAM feed: UV-C emission halts whenever a person is detected in the working area. Making a machine safe to run near people is the reason I took functional safety in my master’s.',
    ],
    facts: [],
    tags: ['ESP32-CAM', 'Arduino Nano', 'Embedded C++', 'Camera streaming', 'Mobile app', 'Safety interlocks'],
    media: [vid('uv-robot', 'Mobile robot with a tall lamp column driving through a room, then switching its lamps on', 'Driving and switching on the lamp column')],
    links: [],
    portrait: true,
  },
  {
    id: 'power-monitor',
    group: 'robotics',
    title: 'Power monitoring system',
    summary: 'A simulated Arduino energy meter streaming live readings to a LabVIEW dashboard.',
    body: [
      'A Proteus simulation of an Arduino Uno that measures current with an ACS712 sensor and voltage through a transformer and divider, timestamps readings with a DS3232 real-time clock, and sends them over a virtual serial port to LabVIEW through VISA.',
      'The LabVIEW front panel shows voltage, current, power factor, phase angle, real, reactive and apparent power, energy and cost, and logs every reading to an Excel report.',
    ],
    facts: [],
    tags: ['LabVIEW', 'NI-VISA', 'Proteus', 'Arduino', 'ACS712', 'UART'],
    media: [
      img('labview-panel', 'LabVIEW front panel with voltage, current, power and cost plots', 'LabVIEW front panel'),
      vid('labview-demo', 'Screen recording of the dashboard updating and logging to Excel', 'Live run with Excel logging'),
      img('labview-schematic', 'Proteus schematic with Arduino Uno, current sensor, transformer and RTC', 'Proteus circuit'),
    ],
    links: [],
  },
  {
    id: 'mr-inspection',
    group: 'vision',
    featured: true,
    title: 'Mixed-reality assembly inspection',
    summary: 'On-headset YOLO reads a LEGO model’s build variant and flags assembly errors on Meta Quest 3.',
    body: [
      'Visual inspection through the Quest 3 passthrough camera, with inference running on the headset rather than off-board. I built a PyQt5 tool for capturing, labelling and curating training images, trained a YOLO detector on that dataset, and handled model conversion and runtime integration in Unity.',
      'The detector reads the parts of a LEGO model, maps them to one of its build variants and flags assembly errors in a mixed-reality overlay. A live feed forces trade-offs: model size against frame rate, resolution against reliability, and what to do with frames when inference falls behind.',
    ],
    facts: [],
    tags: ['YOLO', 'PyTorch', 'ONNX', 'Unity', 'Meta Quest 3', 'PyQt5', 'Dataset engineering'],
    media: [
      img('mr-captures', 'Three headset captures: live detection, the model input region, and the variant read-out', 'Captures from the headset'),
      img('mr-pipeline', 'Pipeline: camera frame, crop and resize, YOLO, decode and NMS, threshold, overlay and variant', 'On-device inference pipeline'),
    ],
    thumb: 'mr-live',
    links: [],
  },
  {
    id: 'tea-leaf',
    group: 'vision',
    title: 'Tea-leaf defect detection',
    summary: 'A YOLO detector that spots defective tea leaves, running entirely in your browser.',
    body: [
      'A YOLO detector trained to separate defective from healthy tea leaves, aimed at a Raspberry Pi 5 inspection station with a camera over a conveyor belt.',
      'The live demo runs the exported ONNX model in the browser with onnxruntime-web, using WebGPU where available and WebAssembly otherwise, so your images never leave your device.',
    ],
    facts: [],
    tags: ['YOLO', 'Ultralytics', 'ONNX', 'onnxruntime-web', 'WebGPU', 'Raspberry Pi 5'],
    media: [img('tea-leaf', 'Tea Leaf Inspection web app ready to analyse an image in the browser', 'The in-browser demo')],
    links: [
      { label: 'Try the live demo', href: 'https://midhunr1996.github.io/leaf_disease_detector/' },
      { label: 'Code on GitHub', href: 'https://github.com/midhunr1996/leaf_disease_detector' },
    ],
  },
  {
    id: 'mitosis',
    group: 'vision',
    title: 'Mitosis detection in tissue slides',
    summary: 'YOLO finds candidate nuclei, then EfficientNetV2 decides which ones are dividing.',
    body: [
      'Histopathology images were labelled in YOLO format, colour-normalised and augmented. A YOLO detector proposes candidate nuclei, each crop goes to an EfficientNetV2 classifier that labels it mitotic or non-mitotic, and the labels are mapped back onto the detections.',
    ],
    facts: ['97.15% classification accuracy on the crop classifier'],
    tags: ['YOLO', 'EfficientNetV2', 'Histopathology', 'Python'],
    media: [
      img('mitosis-results', 'Side-by-side tissue image with actual and predicted mitosis labels', 'Actual and predicted labels'),
      img('mitosis-pipeline', 'Flowchart of preprocessing, detection training, classification training and inference', 'Two-stage pipeline'),
    ],
    links: [],
  },
  {
    id: 'nuclei-segmentation',
    group: 'vision',
    title: 'Nuclei segmentation and counting',
    summary: 'A U-Net with an EfficientNetV2-L encoder, plus watershed, separates and counts cell nuclei.',
    body: [
      'Semantic segmentation of cell nuclei in H&E tissue patches from the MoNuSeg dataset, using a U-Net with an EfficientNetV2-L encoder.',
      'Post-processing turns the mask into separate instances (morphology, dilation, distance transform, thresholding and watershed), which gives a per-nucleus map and a count for each image.',
    ],
    facts: [],
    tags: ['U-Net', 'EfficientNetV2-L', 'MoNuSeg', 'OpenCV', 'Watershed'],
    media: [
      img('nuclei-results', 'Test images with labels, predictions and coloured instance maps, with nucleus counts of 47, 21 and 44', 'Predictions and instance counts'),
      img('nuclei-steps', 'Post-processing steps from predicted mask to watershed instance map', 'Mask to instances'),
    ],
    links: [],
  },
  {
    id: 'brain-tumour',
    group: 'vision',
    title: 'Brain-tumour MRI segmentation',
    summary: 'A U-Net with an EfficientNetV2-L encoder outlines three tumour sub-regions in MRI.',
    body: [
      'MRI slices are cropped from 240 × 240 to 128 × 128, normalised and stacked into one multi-modal volume. A U-Net with an EfficientNetV2-L encoder predicts three tumour sub-regions: edema, enhancing tumour and necrotic core.',
    ],
    facts: [],
    tags: ['U-Net', 'EfficientNetV2-L', 'MRI', 'Semantic segmentation'],
    media: [
      img('brain-prediction', 'MRI slice with ground-truth and predicted tumour regions', 'Label and prediction'),
      img('brain-architecture', 'Preprocessing, EfficientNetV2-L encoder and decoder architecture', 'Model architecture'),
    ],
    links: [],
  },
  {
    id: 'facial-expression',
    group: 'vision',
    title: 'Facial expression recognition',
    summary: 'A lightweight MobileViT classifier for seven facial expressions.',
    body: [
      'MTCNN crops the face, then a MobileViT backbone with a squeeze-and-excitation layer classifies seven expressions: angry, disgust, fear, happy, neutral, sad and surprise.',
      'Training on RAF-DB used CutMix augmentation, and Score-CAM maps show which facial regions drive each prediction.',
    ],
    facts: [],
    tags: ['MobileViT', 'Squeeze-and-excitation', 'MTCNN', 'CutMix', 'RAF-DB', 'Score-CAM'],
    media: [img('expression-architecture', 'MobileViT architecture with squeeze-and-excitation block and seven output classes', 'Model architecture')],
    links: [],
  },
  {
    id: 'akbar-drive',
    group: 'mechanical',
    featured: true,
    title: 'Compound cycloidal drive, 144 : 1',
    summary: 'A parametric two-disc cycloidal reducer. It is the drive turning at the top of this page.',
    body: [
      'A fully parametric compound cycloidal drive written as a Lua CAD script. One eccentric shaft carries two bonded discs: a 12-lobe disc runs in a fixed 13-pin ring, and an 11-lobe disc drives a 12-pin output ring, which gives 144 : 1 with the output turning the same way as the input.',
      'I derived the disc profile and the scalloped pin pockets from the cycloid equations. The script also builds the split eccentric shaft, bearing seats, an exploded view and a print-tolerance mode. The aim is high-ratio, low-backlash actuation for robot joints, and I rendered explainer animations of the kinematics.',
    ],
    facts: ['Ratio 144 : 1, output turns with the input', 'Pin circle Ø60 mm, pins Ø7 mm', 'Eccentricity 1.27 mm'],
    tags: ['Lua', 'Parametric CAD', 'IceSL', 'Mechanism kinematics', 'Mathematical modelling', '3D printing'],
    media: [vid('akbar-explainer', 'Animated explainer: both rings, the disc stack and input and output dials', 'Kinematics explainer I rendered')],
    links: [],
  },
  {
    id: 'gyroid-exchanger',
    group: 'mechanical',
    title: 'Gyroid heat exchanger',
    summary: 'An oil–fuel heat exchanger built from a gyroid lattice and simulated in Ansys.',
    body: [
      'A capsule-shaped shell filled with a gyroid lattice in nTopology, which splits the inside into two separate fluid domains for hot oil and cold fuel. A conjugate heat-transfer simulation in Ansys gives the temperature field and the outlet temperatures.',
    ],
    facts: ['Hot oil: 363 K in, 322.5 K out', 'Cold fuel: 283 K in, 297.4 K out'],
    tags: ['nTopology', 'Gyroid / TPMS', 'Ansys Fluent', 'CFD', 'SolidWorks'],
    media: [
      img('gyroid-temperature', 'Temperature contour over the gyroid fluid domain', 'Temperature contour'),
      img('gyroid-structure', 'Shell, gyroid lattice and combined structure', 'Gyroid lattice in the shell'),
      img('gyroid-results', 'Table of inlet and outlet temperatures', 'Outlet temperatures'),
    ],
    links: [],
  },
  {
    id: 'roughness-ml',
    group: 'mechanical',
    title: 'Surface-quality prediction for machining',
    summary: 'Regression models that predict surface roughness from process parameters.',
    body: [
      'I built XGBoost, Random Forest and neural-network regressors to predict surface quality from machining parameters, and planned the experiments as a structured L18 design to cover the parameter space on a limited budget.',
      'Models were compared with cross-validation and like-for-like error analysis, so results were judged statistically rather than by eye.',
    ],
    facts: [],
    tags: ['Python', 'scikit-learn', 'XGBoost', 'pandas', 'Design of experiments'],
    media: [],
    links: [],
  },
  {
    id: 'verali',
    group: 'apps',
    title: 'Group Riding app',
    summary: 'Shows each rider in your group ahead of or behind you, live.',
    body: [
      'An interactive preview of an Android app for group rides. It simulates four riders on a 110 km route and works out each rider’s distance and bearing relative to your own heading, with clear status for riders who stop, fall behind or go offline.',
      'Radar, group, map and ride-code screens and a 90-second guided tour, all in plain JavaScript with no build step.',
    ],
    facts: [],
    tags: ['JavaScript', 'Geodesy', 'HTML/CSS'],
    media: [vid('verali-walkthrough', 'Walkthrough of the radar, group and map screens', 'Guided walkthrough', 'verali-poster')],
    links: [
      { label: 'Open the preview', href: 'https://midhunr1996.github.io/verali-app/' },
      { label: 'Code on GitHub', href: 'https://github.com/midhunr1996/verali-app' },
    ],
  },
  {
    id: 'am-study',
    group: 'apps',
    title: 'Additive manufacturing study guide',
    summary: 'A searchable revision site with 244 exam-style questions and worked answers.',
    body: [
      'A static site generated from Markdown, with a detailed note on the seven ASTM F42 / ISO 52900 process families and 244 questions across 15 topics. Answers reveal on click, and everything is searchable.',
    ],
    facts: [],
    tags: ['Node.js', 'markdown-it', 'Static site'],
    media: [img('am-study', 'Additive manufacturing study guide home page', 'The study site')],
    links: [
      { label: 'Open the site', href: 'https://midhunr1996.github.io/additive-manufacturing-study-guide/' },
      { label: 'Code on GitHub', href: 'https://github.com/midhunr1996/additive-manufacturing-study-guide' },
    ],
  },
  {
    id: 'cps-study',
    group: 'apps',
    title: 'CPS risk-management revision site',
    summary: 'A walkthrough, flashcards and practice questions for one master’s module.',
    body: [
      'A single-page revision site for the cyber-physical systems risk-management module: a story-style walkthrough of the lectures, flip flashcards, practice exam questions and a one-page summary card.',
    ],
    facts: [],
    tags: ['HTML', 'JavaScript'],
    media: [img('cps-study', 'CPS risk management revision site', 'The revision site')],
    links: [
      { label: 'Open the site', href: 'https://midhunr1996.github.io/cps-study/' },
      { label: 'Code on GitHub', href: 'https://github.com/midhunr1996/cps-study' },
    ],
  },
];

// Bill of materials: each part lists the projects (by id) or roles (by timeline id) where it was used.
export const billOfMaterials = [
  {
    group: 'Robotics',
    parts: [
      { part: 'ROS / ROS 2', usedIn: ['object-tracking-robot', 'tb3-follower'] },
      { part: 'Sensor fusion', usedIn: ['object-tracking-robot', 'tb3-follower'] },
      { part: 'Behaviour trees, Gazebo', usedIn: ['tb3-follower'] },
      { part: 'Mobile-robot control', usedIn: ['object-tracking-robot', 'tb3-follower', 'uv-robot'] },
      { part: 'Mechanism design', usedIn: ['akbar-drive'] },
    ],
  },
  {
    group: 'Perception and machine learning',
    parts: [
      { part: 'YOLO detectors', usedIn: ['object-tracking-robot', 'tb3-follower', 'mr-inspection', 'tea-leaf', 'mitosis'] },
      { part: 'Segmentation (U-Net)', usedIn: ['nuclei-segmentation', 'brain-tumour'] },
      { part: 'PyTorch, ONNX deployment', usedIn: ['mr-inspection', 'tea-leaf'] },
      { part: 'OpenCV', usedIn: ['object-tracking-robot', 'nuclei-segmentation'] },
      { part: 'XGBoost, scikit-learn, DoE', usedIn: ['roughness-ml'] },
    ],
  },
  {
    group: 'Embedded and hardware',
    parts: [
      { part: 'ESP32, Arduino', usedIn: ['uv-robot', 'power-monitor', 'protocod'] },
      { part: 'STM32, Raspberry Pi', usedIn: ['protocod', 'tea-leaf'] },
      { part: 'SPI, I2C, UART, CAN', usedIn: ['protocod', 'itronic', 'power-monitor'] },
      { part: 'Real-time firmware, calibration', usedIn: ['itronic'] },
      { part: 'Oscilloscope, logic analyser, JTAG', usedIn: ['itronic', 'protocod'] },
      { part: 'Schematics, PCB layout', usedIn: ['protocod'] },
    ],
  },
  {
    group: 'Software',
    parts: [
      { part: 'Python', usedIn: ['tb3-follower', 'mr-inspection', 'mitosis', 'nuclei-segmentation', 'roughness-ml', 'protocod'] },
      { part: 'C, C++', usedIn: ['object-tracking-robot', 'uv-robot', 'itronic', 'protocod'] },
      { part: 'Lua', usedIn: ['akbar-drive', 'itronic'] },
      { part: 'JavaScript', usedIn: ['tea-leaf', 'verali', 'am-study', 'cps-study'] },
      { part: 'PyQt5 tools', usedIn: ['tb3-follower', 'mr-inspection'] },
      { part: 'MATLAB, LabVIEW', usedIn: ['power-monitor', 'protocod'] },
    ],
  },
  {
    group: 'CAD and simulation',
    parts: [
      { part: 'Parametric CAD scripting', usedIn: ['akbar-drive'] },
      { part: 'SolidWorks, nTopology, Ansys', usedIn: ['gyroid-exchanger'] },
      { part: 'Proteus, Altium Designer', usedIn: ['power-monitor', 'protocod'] },
    ],
  },
];

// The real design parameters of the Akbar drive (from the Lua model), used by the hero render.
export const gearbox = {
  name: 'Akbar compound cycloidal drive',
  stages: [
    { lobes: 12, pins: 13 },
    { lobes: 11, pins: 12 },
  ],
  pinCircleRadius: 30,
  pinRadius: 3.5,
  eccentricity: 1.27,
  faceWidth: 8,
  stageGap: 2.4,
  ringOuterRadius: 43.55,
};
