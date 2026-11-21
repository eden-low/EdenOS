import atlas from './assets/eden-treasurer-abacus-motion-v1.webp'
import type { AvatarMotionDefinition } from './avatarMotion'

export const treasurerMotion = {
  prototype:'4G-A',capabilities:{blink:true,abacus:true},
  atlas:{src:atlas,width:792,height:984,cellWidth:264,cellHeight:492,columns:3},
  waitMs:{blink:6200,abacus:22000},
  sequences:{
    blink:[{frame:0,ms:50},{frame:1,ms:80},{frame:2,ms:110},{frame:1,ms:80},{frame:0,ms:60}],
    abacus:[{frame:0,ms:180},{frame:3,ms:400},{frame:4,ms:500},{frame:5,ms:300},{frame:0,ms:220}],
  },
} as const satisfies AvatarMotionDefinition
