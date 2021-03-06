// ###new NurbsSurface( degree, controlPoints, weights, knots )
//
// Constructor for a NurbsCurve
//
// **params**
// + *Number*, The degree of the curve
// + *Array*, Array of arrays representing the control points
// + *Array*, Array of numbers representing the control point weights
// + *Array*, Array of numbers representing the knot structure

verb.geom.NurbsCurve = function( degree, controlPoints, weights, knots ) {

	verb.geom.NurbsGeometry.call(this);

	this.setAll({
		"controlPoints": controlPoints,
		"weights": weights,
		"knots": knots ? knots.slice(0) : [],
		"degree": degree
	});

}.inherits( verb.geom.NurbsGeometry );

//
// ####point( u [, callback] )
//
// Sample a point at the given parameter 
//
// **params**
// + *Number*, The parameter to sample the curve
// + *Function*, Optional callback to do it async
//
// **returns**
// + *Array*, An array if called synchronously, otherwise nothing

verb.geom.NurbsCurve.prototype.point = function( u, callback ) {

	return this.nurbsEngine.eval( 'rational_curve_point', [ this.get('degree'), this.get('knots'), this.homogenize(),  u ], callback ); 

};

//
// ####derivatives( u, num_derivs [, callback] )
//
// Get derivatives at a given parameter
//
// **params**
// + *Number*, The parameter to sample the curve
// + *Number*, The number of derivatives to obtain
// + *Number*, The callback, if you want this async
//
// **returns**
// + *Array*, An array if called synchronously, otherwise nothing

verb.geom.NurbsCurve.prototype.derivatives = function( u, num_derivs, callback ) {

	return this.nurbsEngine.eval( 'rational_curve_derivs', [ this.get('degree'), this.get('knots'), this.homogenize(),  u, num_derivs  ], callback ); 

};

//
// ####tessellate(options [, callback] )
//
// Tessellate a curve at a given tolerance
//
// **params**
// + *Number*, The parameter to sample the curve
// + *Number*, The number of derivatives to obtain
// + *Number*, The callback, if you want this async
//
// **returns**
// + *Array*, An array if called synchronously, otherwise nothing

verb.geom.NurbsCurve.prototype.tessellate = function(options, callback){

	var options = options || {};
	options.tolerance = options.tolerance || verb.EPSILON;

	return this.nurbsEngine.eval( 'rational_curve_adaptive_sample', [ this.get('degree'), this.get('knots'), this.homogenize(), options.tolerance ], callback ); 

};

//
// ####split( u [, callback] )
//
// Split the curve at the given parameter
//
// **params**
// + *Number*, The parameter at which to split the curve
// + *Function*, Optional callback to do it async
//
// **returns**
// + *Array*, Two curves - one at the lower end of the parameter range and one at the higher end.  

verb.geom.NurbsCurve.prototype.split = function( u, callback ) {

	var domain = this.domain();

	if ( u <= domain[0] || u >= domain[1] ) {
		throw new Error("Cannot split outside of the domain of the curve!");
	}

	// transform the result from the engine into a valid pair of NurbsCurves
	function asNurbsCurves(res){

		var cpts0 = verb.eval.nurbs.dehomogenize_1d( res[0].control_points );
		var wts0 = verb.eval.nurbs.weight_1d( res[0].control_points );

		var c0 = new verb.geom.NurbsCurve( res[0].degree, cpts0, wts0, res[0].knots );

		var cpts1 = verb.eval.nurbs.dehomogenize_1d( res[1].control_points );
		var wts1 = verb.eval.nurbs.weight_1d( res[1].control_points );

		var c1 = new verb.geom.NurbsCurve( res[1].degree, cpts1, wts1, res[1].knots );

		return [c0, c1];
	}

	if (callback){
		return this.nurbsEngine.eval( 'curve_split', [ this.get('degree'), this.get('knots'), this.homogenize(), u ], function(res){
			return callback( asNurbsCurves(res) );
		});
	} 

	return asNurbsCurves( this.nurbsEngine.eval( 'curve_split', [ this.get('degree'), this.get('knots'), this.homogenize(), u ]));

};


//
// ####domain()
//
// Determine the valid domain of the curve
//
//
// **returns**
// + *Array*, An array representing the high and end point of the domain of the curve 

verb.geom.NurbsCurve.prototype.domain = function() {

	var knots = this.get('knots');
	return [ knots[0], knots[knots.length-1] ];

}

//
// ####transform( mat )
//
// Transform a curve with the given matrix.
//
// **params**
// + *Array*, 4d array representing the transform
//
// **returns**
// + *Array*, An array if called synchronously, otherwise nothing

verb.geom.NurbsCurve.prototype.transform = function( mat ){

	var pts = this.get("controlPoints");

	for (var i = 0; i < pts.length; i++){
		var homoPt = pts[1].push(1);
		pts[i] = numeric.mul( mat, homoPt ).slice( 0, homoPt.length-2 );
	}

	this.set('controlPoints', pts);

	return this;

}; 


//
// ####clone()
//
// Obtain a copy of the curve
//
// **params**
// + *Array*, 4d array representing the transform
//
// **returns**
// + *Array*, An array if called synchronously, otherwise nothing

verb.geom.NurbsCurve.prototype.clone = function(){

	// copy the control points
	var pts = this.get("controlPoints");

	var pts_copy = [];

	for (var i = 0; i < pts.length; i++){
		pts_copy.push( pts[i].slice(0) );
	}

	return new verb.geom.NurbsCurve( this.get('degree'), pts_copy, this.get('weights').slice(0), this.get('knots').slice );

};

//
// ####homogenize()
//
// Obtain the homogeneous representation of the control points
//
// **returns**
// + *Array*, 2d array of homogenized control points

verb.geom.NurbsCurve.prototype.homogenize = function(){

	return verb.eval.nurbs.homogenize_1d( this.get('controlPoints'), this.get('weights') );

};


//
// ####update()
//
// If this is a subtype of the NurbsCurve, this method will update the Nurbs representation
// of the curve from those parameters.  This destroys any manual changes to the Nurbs rep.
verb.geom.NurbsCurve.prototype.update = function(){

	if ( !this.nurbsRep ){
		return;
	}

	var curve_props = this.nurbsRep();

	this.setAll({
		"controlPoints": curve_props.control_points,
		"weights": curve_props.weights,
		"knots": curve_props.knots,
		"degree": curve_props.degree
	});

};
