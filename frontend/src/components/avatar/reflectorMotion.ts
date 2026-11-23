import atlas from './assets/eden-reflector-journal-motion-v1.webp'
import type { AvatarMotionDefinition } from './avatarMotion'

export const reflectorMotion = {
  prototype:'4G-B2',secondaryAction:'pageTurn',capabilities:{blink:true,journalWrite:true,pageTurn:true},
  atlas:{src:atlas,width:792,height:984,cellWidth:264,cellHeight:492,columns:3},
  waitMs:{blink:6800,pageTurn:26000},
  sequences:{
    blink:[{frame:0,ms:50},{frame:1,ms:80},{frame:2,ms:110},{frame:1,ms:80},{frame:0,ms:60}],
    pageTurn:[{frame:0,ms:180},{frame:3,ms:500},{frame:4,ms:600},{frame:5,ms:300},{frame:0,ms:220}],
  },
} as const satisfies AvatarMotionDefinition
