// 1. Number of folds
// 2. Number of columns
// 3. Angle of the folds
// 4. Thickness of sides/walls
// 5. "Distance between flats"
// 6. Length of lip ends

quality = $preview ? 50 : 200;

/* Begin parameters */
total_folding_height = 100;
number_of_folds = 10; 
number_of_columns = 8;
folding_angle = 45; /* It can either depends on the folding height or on the folding angle */
wall_thickness = 2;
radius = 30;
LipEnd_height = 20;
/* End parameters */

fold_height = total_folding_height / number_of_folds;

/* A trapzeoid is composed of a triangle with a rounded corner */
function TWORHOMBOIDS(x=1, y=1, angle=90) 
= [
    [0,0],
    [x,0],
    [x+x*cos(angle)/sin(angle),y],
    [x,y*2],
    [0,y*2],
    [x*cos(angle)/sin(angle),y]
];

module Folding(number_of_folds) {  
    for(i= [0:number_of_folds-1]){
        translate([0,0,i*fold_height])
        rotate_extrude(angle=360, convexity=10, $fn = number_of_columns)
        translate([radius,0,0]) polygon(TWORHOMBOIDS(wall_thickness,fold_height/2,folding_angle));
    }
}

module LipEnd(height){
    difference() {
        cylinder(h=height,r=radius+wall_thickness,center=true,$fn=number_of_columns);
        cylinder(h=height+1,r=radius,center=true, $fn=number_of_columns);

    } 
}

module Assembly() {
    LipEnd(LipEnd_height);
    Folding(number_of_folds);
    translate([0,0,total_folding_height+LipEnd_height/2])
    LipEnd(LipEnd_height);
}

module main(){
    Assembly();  

}

main();